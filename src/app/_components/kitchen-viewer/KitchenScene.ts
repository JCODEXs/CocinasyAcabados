import * as THREE from "three";
import type { RouterOutputs } from "@/trpc/react";
import { LowerCabinet }  from "./objects/LowerCabinet";
import { UpperCabinet }  from "./objects/UpperCabinet";
import { Island }        from "./objects/Island";
import { Appliance }     from "./objects/Appliance";
import { WallPanel }     from "./objects/WallPanel";
import { KitchenObject } from "./objects/KitchenObject";

type Project   = RouterOutputs["quotes"]["getProject"];
type QuoteItem = Project["layoutGroups"][number]["items"][number];

// Alturas base en metros según categoría
const CATEGORY_Y_OFFSET: Record<string, number> = {
  MUEBLE_BAJO:      0,
  ELECTRODOMESTICO: 0,
  MESON:            0,
  PANEL_YESO:       0,
  SUPERBOARD:       0,
  PUERTA:           0,
  ESTANTE:          0,
  OTRO:             0,
  MUEBLE_ALTO:      1.40,  // se monta sobre los muebles bajos
};

// Offset de profundidad (Z) según categoría — muebles altos van más pegados a la pared
const CATEGORY_Z_OFFSET: Record<string, number> = {
  MUEBLE_BAJO:      0,
  MUEBLE_ALTO:      0.125, // retranqueo visual: 60cm fondo - 35cm alto = 12.5cm
  ELECTRODOMESTICO: 0,
  MESON:            0,
  PANEL_YESO:       0,
  SUPERBOARD:       0,
  PUERTA:           0,
  ESTANTE:          0.125,
  OTRO:             0,
};

export class KitchenScene {
  readonly scene:    THREE.Scene;
  readonly camera:   THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;

  private kitchenObjects = new Map<string, KitchenObject>();
  private selectedId: string | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse     = new THREE.Vector2();

  onSelect?: (itemId: string | null, label: string | null) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    (this.renderer as any).outputEncoding = 3001;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0e0e12);
    this.scene.fog = new THREE.Fog(0x0e0e12, 14, 30);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.05, 60);
    this.camera.position.set(4, 3, 4);
    this.camera.lookAt(2, 0.8, 1.5);

    this.buildLights();
  }

  // ─── Luces ────────────────────────────────────────────────────────────────

  private buildLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.45));

    const sun = new THREE.DirectionalLight(0xfff5e8, 1.5);
    sun.position.set(6, 10, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near   = 0.1;
    sun.shadow.camera.far    = 40;
    sun.shadow.camera.left   = sun.shadow.camera.bottom = -10;
    sun.shadow.camera.right  = sun.shadow.camera.top    =  10;
    sun.shadow.bias = -0.001;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0xd0e8ff, 0.45);
    fill.position.set(-5, 4, -3);
    this.scene.add(fill);

    const strip = new THREE.PointLight(0xffe8c0, 0.5, 3);
    strip.position.set(1.5, 1.35, 0.4);
    this.scene.add(strip);
  }

  // ─── Habitación ───────────────────────────────────────────────────────────
  // Sistema de coordenadas:
  //   Origen (0,0,0) = esquina interior izquierda-fondo-suelo
  //   X → derecha a lo largo de la pared de fondo
  //   Z → hacia el frente (profundidad del espacio)
  //   Y → arriba

  buildRoom(roomW: number, roomL: number, roomH: number) {
    const W = roomW / 100;  // cm → m
    const L = roomL / 100;
    const H = roomH / 100;
    const WALL = 0.1;       // grosor de pared en m

    const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.9, metalness: 0.04 });
    const wallMat  = new THREE.MeshStandardMaterial({ color: 0xf5f0ea, roughness: 1,   metalness: 0 });

    // Piso — centrado en X y Z del espacio interior
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.02, L), floorMat);
    floor.position.set(W / 2, -0.01, L / 2);
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Pared de fondo — cara interior en Z=0, la malla se extiende hacia Z negativo
    const wallBack = new THREE.Mesh(new THREE.BoxGeometry(W + WALL * 2, H, WALL), wallMat);
    wallBack.position.set(W / 2-0.1, H / 2, -WALL / 2);
    wallBack.receiveShadow = true;
    this.scene.add(wallBack);

    // Pared izquierda — cara interior en X=0, la malla se extiende hacia X negativo
    const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(WALL, H, L + WALL * 2), wallMat);
    wallLeft.position.set(-WALL / 2-0.1, H / 2, L / 2);
    wallLeft.receiveShadow = true;
    this.scene.add(wallLeft);

    // Grid de referencia sobre el piso
    const grid = new THREE.GridHelper(Math.max(W, L) * 1.4, 24, 0x333340, 0x222230);
    grid.position.set(W / 2, 0.002, L / 2);
    this.scene.add(grid);

    // Reposicionar cámara para encuadrar la habitación
    this.camera.position.set(W * 0.85, H * 0.9, L * 1.1);
    this.camera.lookAt(W / 2, H * 0.3, L / 2);
  }

  // ─── Construir escena desde proyecto ─────────────────────────────────────

  buildFromProject(project: Project) {
    for (const obj of this.kitchenObjects.values()) {
      this.scene.remove(obj);
    }
    this.kitchenObjects.clear();

    const roomW = project.roomWidth  ?? 400;
    const roomL = project.roomLength ?? 320;
    const roomH = project.roomHeight ?? 260;
    this.buildRoom(roomW, roomL, roomH);

    for (const group of project.layoutGroups) {
      for (const item of group.items) {
        // Expandir ítems con quantity > 1 en instancias separadas
        // Cada instancia se desplaza item.width en X respecto a la anterior
        for (let i = 0; i < item.quantity; i++) {
          const instanceKey = i === 0 ? item.id : `${item.id}__${i}`;
          const posXOffset  = i * item.width;   // cm, acumulados en la dirección del grupo
          this.addQuoteItem(item, instanceKey, posXOffset);
        }
      }
    }
  }

  // ─── Instanciar un QuoteItem ──────────────────────────────────────────────

  private addQuoteItem(item: QuoteItem, instanceKey: string, posXOffset = 0) {
    const obj = this.createObject(item);
    if (!obj) return;

    const cat = item.elementType.category;

    // posX y posZ vienen en cm desde layoutService.recalculateGroupPositions
    // posXOffset desplaza instancias adicionales (quantity > 1) en X
    const x = (item.posX + posXOffset) / 100;
    const y = (item.posY / 100) + (CATEGORY_Y_OFFSET[cat] ?? 0);
    const z = (item.posZ / 100) + (CATEGORY_Z_OFFSET[cat] ?? 0);

    obj.position.set(x, y, z);
    obj.rotation.y = (item.rotationY * Math.PI) / 180;

    const config = this.buildMaterialConfig(item);
    obj.applyMaterialConfig(config);

    this.scene.add(obj);
    this.kitchenObjects.set(instanceKey, obj);
  }

  // ─── Crear objeto Three.js según categoría ────────────────────────────────

  private createObject(item: QuoteItem): KitchenObject | null {
    const p = {
      width:  item.width,
      height: item.height,
      depth:  item.depth,
      label:  item.label ?? item.elementType.name,
      itemId: item.id,
    };

    const cat   = item.elementType.category;
    const model = item.elementType.threeJsModel;

    switch (cat) {
      case "MUEBLE_BAJO":
        return new LowerCabinet(p);

      case "MUEBLE_ALTO":
        return new UpperCabinet({
          ...p,
          hasGlassDoors: model === "UpperCabinetGlass",
          numShelves:    model === "UpperCabinetShelves" ? 2 : 1,
        });

      case "MESON":
        // Mesón: caja plana, reutilizamos LowerCabinet sin puertas
        return new LowerCabinet({ ...p, height: 4 });

      case "ELECTRODOMESTICO": {
        const appType =
          model === "Fridge" ? "REFRIGERADOR" :
          model === "Oven"   ? "HORNO"        :
          model === "Sink"   ? "LAVAPLATOS"   :
          model === "Hood"   ? "CAMPANA"      : "GENERICO";
        return new Appliance({ ...p, applianceType: appType });
      }

      case "PANEL_YESO":
      case "SUPERBOARD":
        return new WallPanel(p);

      case "ESTANTE":
        return new UpperCabinet({ ...p, numShelves: 3, hasGlassDoors: false });

      case "ISLA":
        return new Island(p);

      default:
        return new LowerCabinet(p);
    }
  }

  // ─── Configuración de materiales desde componentes ────────────────────────

  private buildMaterialConfig(item: QuoteItem) {
    const bodyComp   = item.components.find(c =>
      ["LATERAL", "TECHO", "PISO", "FONDO"].includes(c.componentType)
    );
    const finishComp = item.components.find(c =>
      ["PUERTA", "FRENTE_CAJON"].includes(c.componentType)
    );
    const mesonComp  = item.components.find(c => c.componentType === "MESON");
    const hw         = item.hardwareItems[0];

    return {
      boardColor:           bodyComp?.material?.color          ?? undefined,
      boardTextureUrl:      bodyComp?.material?.textureUrl     ?? undefined,
      finishColor:          finishComp?.surfaceFinish?.color   ?? finishComp?.material?.color  ?? undefined,
      finishTextureUrl:     finishComp?.surfaceFinish?.textureUrl ?? undefined,
      countertopColor:      mesonComp?.material?.color         ?? undefined,
      countertopTextureUrl: mesonComp?.material?.textureUrl    ?? undefined,
      handleColor:          hw?.hardware ? "#c0a060"           : undefined,
      qualityTier:          hw?.hardware?.qualityTier as any,
    };
  }

  // ─── Actualizar un item sin reconstruir toda la escena ────────────────────

  updateItem(item: QuoteItem) {
    // Actualizar todas las instancias de este item (quantity puede ser > 1)
    for (let i = 0; i < item.quantity; i++) {
      const instanceKey = i === 0 ? item.id : `${item.id}__${i}`;
      const existing    = this.kitchenObjects.get(instanceKey);
      const posXOffset  = i * item.width;

      if (!existing) {
        this.addQuoteItem(item, instanceKey, posXOffset);
        continue;
      }

      const changed =
        Math.abs(existing.W * 100 - item.width)  > 0.5 ||
        Math.abs(existing.H * 100 - item.height) > 0.5 ||
        Math.abs(existing.D * 100 - item.depth)  > 0.5;

      if (changed) existing.setDimensions(item.width, item.height, item.depth);

      const cat = item.elementType.category;
      existing.position.set(
        (item.posX + posXOffset) / 100,
        (item.posY / 100) + (CATEGORY_Y_OFFSET[cat] ?? 0),
        (item.posZ / 100) + (CATEGORY_Z_OFFSET[cat] ?? 0),
      );
      existing.rotation.y = (item.rotationY * Math.PI) / 180;
      existing.applyMaterialConfig(this.buildMaterialConfig(item));
    }

    // Limpiar instancias sobrantes si quantity bajó
    let i = item.quantity;
    while (true) {
      const key = i === 0 ? item.id : `${item.id}__${i}`;
      if (!this.kitchenObjects.has(key)) break;
      this.scene.remove(this.kitchenObjects.get(key)!);
      this.kitchenObjects.delete(key);
      i++;
    }
  }

  removeItem(itemId: string) {
    // Eliminar todas las instancias
    let i = 0;
    while (true) {
      const key = i === 0 ? itemId : `${itemId}__${i}`;
      const obj = this.kitchenObjects.get(key);
      if (!obj) break;
      this.scene.remove(obj);
      this.kitchenObjects.delete(key);
      i++;
    }
  }

  // ─── Selección por raycast ────────────────────────────────────────────────

  handleClick(clientX: number, clientY: number, canvasRect: DOMRect) {
    this.mouse.x =  ((clientX - canvasRect.left) / canvasRect.width)  * 2 - 1;
    this.mouse.y = -((clientY - canvasRect.top)  / canvasRect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const hits = this.raycaster.intersectObjects(this.scene.children, true);

    for (const hit of hits) {
      let obj: THREE.Object3D = hit.object;
      while (obj.parent && !obj.userData.kitchenObject) obj = obj.parent;

      if (obj.userData.kitchenObject && obj instanceof KitchenObject) {
        const newId = obj.userData.itemId as string;

        // Deseleccionar el anterior
        if (this.selectedId) {
          const prev = this.kitchenObjects.get(this.selectedId);
          if (prev) prev.selected = false;
        }

        if (this.selectedId === newId) {
          // Click sobre el mismo → deseleccionar
          this.selectedId = null;
          this.onSelect?.(null, null);
        } else {
          this.selectedId = newId;
          obj.selected = true;
          this.onSelect?.(newId, obj.userData.label as string);
        }
        return;
      }
    }

    // Click en vacío → deseleccionar
    if (this.selectedId) {
      const prev = this.kitchenObjects.get(this.selectedId);
      if (prev) prev.selected = false;
      this.selectedId = null;
      this.onSelect?.(null, null);
    }
  }

  // ─── Resize ───────────────────────────────────────────────────────────────

  resize(w: number, h: number) {
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render() { this.renderer.render(this.scene, this.camera); }

  dispose() {
    this.renderer.dispose();
    this.scene.clear();
    this.kitchenObjects.clear();
  }
}
// import * as THREE from "three";
// import type { RouterOutputs } from "@/trpc/react";
// import { LowerCabinet }    from "./objects/LowerCabinet";
// import { UpperCabinet }    from "./objects/UpperCabinet";
// import { Island }          from "./objects/Island";
// import { Appliance }       from "./objects/Appliance";
// import { WallPanel }       from "./objects/WallPanel";
// import { KitchenObject }   from "./objects/KitchenObject";

// type Project = RouterOutputs["quotes"]["getProject"];
// type QuoteItem = Project["layoutGroups"][number]["items"][number];

// const UPPER_CAB_Y_OFFSET = 1.40; // altura a la que montan los muebles altos (metros)

// export class KitchenScene {
//   readonly scene:    THREE.Scene;
//   readonly camera:   THREE.PerspectiveCamera;
//   readonly renderer: THREE.WebGLRenderer;

//   private kitchenObjects = new Map<string, KitchenObject>();
//   private selectedId: string | null = null;
//   private raycaster = new THREE.Raycaster();
//   private mouse     = new THREE.Vector2();

//   // Callbacks
//   onSelect?: (itemId: string | null, label: string | null) => void;

//   constructor(canvas: HTMLCanvasElement) {
//     // ── Renderer ───────────────────────────────────────────────────────────
//     this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
//     this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
//     this.renderer.shadowMap.enabled = true;
//     this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
//     (this.renderer as any).outputEncoding = 3001; // sRGBEncoding
//     this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
//     this.renderer.toneMappingExposure = 1.1;

//     // ── Scene ──────────────────────────────────────────────────────────────
//     this.scene = new THREE.Scene();
//     this.scene.background = new THREE.Color(0x0e0e12);
//     this.scene.fog = new THREE.Fog(0x0e0e12, 14, 30);

//     // ── Camera ─────────────────────────────────────────────────────────────
//     this.camera = new THREE.PerspectiveCamera(45, 1, 0.05, 60);
//     this.camera.position.set(4, 3, 4);
//     this.camera.lookAt(2, 0.8, 1.5);

//     this.buildLights();
//   }

//   // ─── Iluminación ─────────────────────────────────────────────────────────

//   private buildLights() {
//     this.scene.add(new THREE.AmbientLight(0xffffff, 0.45));

//     const sun = new THREE.DirectionalLight(0xfff5e8, 1.5);
//     sun.position.set(6, 10, 5);
//     sun.castShadow = true;
//     sun.shadow.mapSize.set(2048, 2048);
//     sun.shadow.camera.near = 0.1;
//     sun.shadow.camera.far  = 40;
//     sun.shadow.camera.left = sun.shadow.camera.bottom = -10;
//     sun.shadow.camera.right = sun.shadow.camera.top    =  10;
//     sun.shadow.bias = -0.001;
//     this.scene.add(sun);

//     const fill = new THREE.DirectionalLight(0xd0e8ff, 0.45);
//     fill.position.set(-5, 4, -3);
//     this.scene.add(fill);

//     // Under-cabinet accent
//     const strip = new THREE.PointLight(0xffe8c0, 0.5, 3);
//     strip.position.set(1.5, 1.35, 0.4);
//     this.scene.add(strip);
//   }

//   // ─── Habitación ───────────────────────────────────────────────────────────

//   buildRoom(roomW: number, roomL: number, roomH: number) {
//     // Metros
//     const W = roomW / 100, L = roomL / 100, H = roomH / 100;

//     const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.9, metalness: 0.04 });
//     const wallMat  = new THREE.MeshStandardMaterial({ color: 0xf5f0ea, roughness: 1,   metalness: 0 });

//     const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.02, L), floorMat);
//     floor.position.set(W/2, -0.01, L/2);
//     floor.receiveShadow = true;
//     this.scene.add(floor);

//     const wallBack = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.1), wallMat);
//     wallBack.position.set(W/2-0.8, H/2, 0.05-0.15);
//     wallBack.receiveShadow = true;
//     this.scene.add(wallBack);

//     const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, H, L), wallMat);
//     wallLeft.position.set(0.05-0.8, H/2, L/2-0.2);
//     wallLeft.receiveShadow = true;
//     this.scene.add(wallLeft);

//     // Grid
//     const grid = new THREE.GridHelper(Math.max(W, L) * 1.2, 24, 0x333340, 0x222230);
//     grid.position.set(W/2, 0.001, L/2);
//     this.scene.add(grid);

//     // Centrar cámara en la habitación
//     this.camera.position.set(W * 0.8, W * 0.6, L * 0.9);
//     this.camera.lookAt(W/2, H * 0.3, L/2);
//   }

//   // ─── Construir escena desde proyecto ─────────────────────────────────────

//   buildFromProject(project: Project) {
//     // Limpiar objetos previos
//     for (const obj of this.kitchenObjects.values()) {
//       this.scene.remove(obj);
//     }
//     this.kitchenObjects.clear();

//     const roomW = project.roomWidth  ?? 400;
//     const roomL = project.roomLength ?? 320;
//     const roomH = project.roomHeight ?? 260;
//     this.buildRoom(roomW, roomL, roomH);
//     //expandir items
//     function expandItems(items: QuoteItem[]) {
//   return items.flatMap(item =>
//     Array.from({ length: item.quantity }).map((_, i) => ({
//       ...item,
//       instanceId: `${item.id}-${i}`,
//       posX: item.posX +2+ i * (item.width + (item.gapBeforeCm ?? 0)),
//     }))
//   );
// }


// for (const group of project.layoutGroups) {
//       const expandedItems = expandItems(group.items);
//       console.log(expandedItems,"expandedItems")
//       for (const item of expandedItems) {
//         this.addQuoteItem(item);
//       }
//     }
//   }

//   // ─── Instanciar un QuoteItem ──────────────────────────────────────────────

//   private addQuoteItem(item: QuoteItem) {
//     const obj = this.createObject(item);
//     let heightOffset=0;

//     if (!obj) return;
// function getHeightOffset(item: QuoteItem) {
//   switch (item.elementType.name.toLowerCase().includes()) {
//     case "MUEBLE_BAJO":
//       return 0;

//     case "MESON":
//       return 0.75; // ~72 + cubierta

//     case "MUEBLE_ALTO":
//       return 1.4;

//     default:
//       return 0;
//   }
// }
// function getDepthtOffset(item: QuoteItem) {
//   switch (item.elementType.name.toLowerCase().includes()) {
//     case "MUEBLE_BAJO":
//       return 0;

//     case "MESON":
//       return 0.75; // ~72 + cubierta

//     case "MUEBLE_ALTO":
//       return 0.35;

//     default:
//       return 0;
//   }
// }
//     // Posición desde la DB (metros)
//     obj.position.set(
//       item.posX / 100,
//       item.posY / 100 
//       // + getHeightOffset(item)
//       ,
//       item.posZ / 100 
//       // + getDepthtOffset(item)
//     );
//     obj.rotation.y = (item.rotationY * Math.PI) / 180;

//     // // Ajuste de Y para muebles altos
//     if (item.elementType.category === "MUEBLE_ALTO") {
//       obj.position.y += UPPER_CAB_Y_OFFSET;
//     }

//     // Aplicar configuración de materiales desde componentes del item
//     const config = this.buildMaterialConfig(item);
//     obj.applyMaterialConfig(config);

//     this.scene.add(obj);
//     this.kitchenObjects.set(item.id, obj);
//   }

//   private createObject(item: QuoteItem): KitchenObject | null {
//     const p = {
//       width:  item.width,
//       height: item.height,
//       depth:  item.depth,
//       label:  item.label ?? item.elementType.name,
//       itemId: item.id,
//     };

//     const cat = item.elementType.category;
//     const model = item.elementType.threeJsModel;

//     if (cat === "MUEBLE_BAJO") return new LowerCabinet(p);
//     if (cat === "MUEBLE_ALTO") return new UpperCabinet({ ...p,
//       hasGlassDoors: model === "UpperCabinetGlass",
//       numShelves: model === "UpperCabinetShelves" ? 2 : 1,
//     });
//     if (cat === "MESON")          return new LowerCabinet({ ...p, height: 4 }); // plano solo
//     if (cat === "ELECTRODOMESTICO") {
//       const appType = model === "Fridge" ? "REFRIGERADOR"
//         : model === "Oven" ? "HORNO"
//         : model === "Sink" ? "LAVAPLATOS"
//         : model === "Hood" ? "CAMPANA"
//         : "GENERICO";
//       return new Appliance({ ...p, applianceType: appType });
//     }
//     if (cat === "PANEL_YESO" || cat === "SUPERBOARD") return new WallPanel(p);
//     if (cat === "ESTANTE") return new UpperCabinet({ ...p, numShelves: 3, hasGlassDoors: false });
//     if (cat === "ISLA")    return new Island(p);

//     return new LowerCabinet(p); // fallback
//   }

//   private buildMaterialConfig(item: QuoteItem) {
//     // Usar los colores/texturas de los componentes del item
//     const bodyComp   = item.components.find(c =>
//       ["LATERAL","TECHO","PISO","FONDO"].includes(c.componentType)
//     );
//     const finishComp = item.components.find(c =>
//       ["PUERTA","FRENTE_CAJON"].includes(c.componentType)
//     );
//     const mesonComp  = item.components.find(c => c.componentType === "MESON");
//     const hw         = item.hardwareItems[0];

//     return {
//       boardColor:      bodyComp?.material?.color ?? undefined,
//       boardTextureUrl: bodyComp?.material?.textureUrl ?? undefined,
//       finishColor:     finishComp?.surfaceFinish?.color  ?? finishComp?.material?.color ?? undefined,
//       finishTextureUrl:finishComp?.surfaceFinish?.textureUrl ?? undefined,
//       countertopColor: mesonComp?.material?.color ?? undefined,
//       countertopTextureUrl: mesonComp?.material?.textureUrl ?? undefined,
//       handleColor:     hw?.hardware ? "#c0a060" : undefined,
//       qualityTier:     hw?.hardware?.qualityTier as any,
//     };
//   }

//   // ─── Actualizar un item (sin reconstruir toda la escena) ──────────────────

//   updateItem(item: QuoteItem) {
//     const existing = this.kitchenObjects.get(item.id);
//     if (!existing) { this.addQuoteItem(item); return; }

//     // Re-dimensionar si cambió
//     const changed =
//       Math.abs(existing.W * 100 - item.width)  > 0.5 ||
//       Math.abs(existing.H * 100 - item.height) > 0.5 ||
//       Math.abs(existing.D * 100 - item.depth)  > 0.5;

//     if (changed) existing.setDimensions(item.width, item.height, item.depth);

//     // Actualizar posición y rotación
//     existing.position.set(item.posX/100, item.posY/100, item.posZ/100);
//     if (item.elementType.category === "MUEBLE_ALTO") existing.position.y += UPPER_CAB_Y_OFFSET;
//     existing.rotation.y = (item.rotationY * Math.PI) / 180;

//     // Re-aplicar materiales
//     existing.applyMaterialConfig(this.buildMaterialConfig(item));
//   }

//   removeItem(itemId: string) {
//     const obj = this.kitchenObjects.get(itemId);
//     if (obj) { this.scene.remove(obj); this.kitchenObjects.delete(itemId); }
//   }

//   // ─── Selección por raycast ────────────────────────────────────────────────

//   handleClick(clientX: number, clientY: number, canvasRect: DOMRect) {
//     this.mouse.x = ((clientX - canvasRect.left) / canvasRect.width)  * 2 - 1;
//     this.mouse.y = -((clientY - canvasRect.top)  / canvasRect.height) * 2 + 1;
//     this.raycaster.setFromCamera(this.mouse, this.camera);

//     const hits = this.raycaster.intersectObjects(this.scene.children, true);

//     for (const hit of hits) {
//       let obj: THREE.Object3D = hit.object;
//       while (obj.parent && !obj.userData.kitchenObject) obj = obj.parent;

//       if (obj.userData.kitchenObject && obj instanceof KitchenObject) {
//         const newId = obj.userData.itemId as string;

//         if (this.selectedId) {
//          const selectedObj = this.kitchenObjects.get(this.selectedId);
// if (selectedObj) {
//     selectedObj.selected = false;
//         }
//         if (this.selectedId === newId) {
//           // Deseleccionar
//           this.selectedId = null;
//           this.onSelect?.(null, null);
//         } else {
//           this.selectedId = newId;
//           obj.selected = true;
//           this.onSelect?.(newId, obj.userData.label as string);
//         }
//         return;
//       }
//     }
//     // Click en vacío: deseleccionar
//     if (this.selectedId) {
//         const selectedObj = this.kitchenObjects.get(this.selectedId);
// if (selectedObj) {
//     selectedObj.selected = false;
//       this.selectedId = null;
//       this.onSelect?.(null, null);
//     }
//   }}
// }
  

//   // ─── Resize ───────────────────────────────────────────────────────────────

//   resize(w: number, h: number) {
//     this.renderer.setSize(w, h);
//     this.camera.aspect = w / h;
//     this.camera.updateProjectionMatrix();
//   }

//   // ─── Loop ─────────────────────────────────────────────────────────────────

//   render() { this.renderer.render(this.scene, this.camera); }

//   dispose() {
//     this.renderer.dispose();
//     this.scene.clear();
//     this.kitchenObjects.clear();
//   }
// }