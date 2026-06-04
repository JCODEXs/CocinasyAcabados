/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import * as THREE from "three";
import type { RouterOutputs } from "@/trpc/react";
import { KitchenObject, type MaterialConfig } from "./objects/KitchenObject";
import { DynamicParametricObject } from "./objects/DynamicParametricObject";
import type { ParametricObjectParams } from "./objects/ParametricObject";
import type { ComponentTemplate, Material } from "@prisma/client";


type Project    = RouterOutputs["quotes"]["getProject"];
type ProjectWithDetails = RouterOutputs["quotes"]["getProject"];
type QuoteItem = ProjectWithDetails["layoutGroups"][number]["items"][number];
type Component = QuoteItem["components"][number];
type LayoutGroup = Project["layoutGroups"][number];

// ─── Enums inline — nunca importar de @prisma/client en el cliente ───────────

type ElementCategory =
  | "MUEBLE_BAJO" | "MUEBLE_ALTO" | "MESON" | "ELECTRODOMESTICO"
  | "PANEL_YESO"  | "SUPERBOARD"  | "PUERTA" | "ESTANTE" | "OTRO"|"DINAMICO";

type SceneMode = "REALISTIC" | "WIREFRAME" | "BLUEPRINT";

// ─── Estado por item ──────────────────────────────────────────────────────────
export interface TemplateForConstruction extends ComponentTemplate {
  // Campos adicionales para la construcción en 3D
  materialId: string | null;
  defaultMaterial: Material | null;}
export interface ParametricObjectParams2 {
  width: number; // cm
  height: number;
  depth: number;

  thicknessMM: number;
  backThicknessMM: number;
  zocalo: number;

  assembly: "LATERAL_PASANTE" | "PISO_PASANTE";

  templates: TemplateForConstruction[];

  materialConfig?: MaterialConfig;

  label?: string;
  itemId?: string;
  groupId?: string;
}
interface ItemState {
  item:          QuoteItem;
  primaryObj:    KitchenObject;              // instancia 0
  extraObjs:     Map<number, KitchenObject>; // instancias 1..N para quantity>1
  lastUpdate:    number;
}

// ─── Clase principal ──────────────────────────────────────────────────────────

export class KitchenScene {
  readonly scene:    THREE.Scene;
  readonly camera:   THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;

  private readonly roomGroup:   THREE.Group = new THREE.Group();
  private readonly itemsGroup:  THREE.Group = new THREE.Group();
  private readonly helperGroup: THREE.Group = new THREE.Group();
  private readonly lightGroup:  THREE.Group = new THREE.Group();

  private ambientLight!: THREE.AmbientLight;
  private sunLight!:     THREE.DirectionalLight;
  private fillLight!:    THREE.DirectionalLight;
  private stripLight!:   THREE.PointLight;

  private itemState  = new Map<string, ItemState>();
  private selectedId: string | null = null;

  private raycaster = new THREE.Raycaster();
  private mouse     = new THREE.Vector2();

  private sceneMode: SceneMode = "REALISTIC";
  private wireframeOverride: THREE.Material | null = null;

  // Defaults configurables
  private lowerCabH  = 0.72;   // altura estándar mueble bajo (m)
  private countertopH = 0.04;   // grosor mesón (m)

  onSelect?: (itemId: string | null, label: string | null) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf5f5f5);
    this.scene.fog = new THREE.Fog(0x0e0e12, 14, 30);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.05, 60);
    this.camera.position.set(4, 3, 4);
    this.camera.lookAt(2, 0.8, 1.5);

    this.scene.add(this.roomGroup, this.itemsGroup, this.helperGroup, this.lightGroup);
    this.buildLights();
  }

  // ─── Luces ────────────────────────────────────────────────────────────────

  private buildLights() {
    this.ambientLight = new THREE.AmbientLight(0x404060, 0.45);
    this.lightGroup.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfff5e8, 1.5);
    this.sunLight.position.set(6, 10, 5);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near   = 0.1;
    this.sunLight.shadow.camera.far    = 40;
    this.sunLight.shadow.camera.left   = this.sunLight.shadow.camera.bottom = -10;
    this.sunLight.shadow.camera.right  = this.sunLight.shadow.camera.top    =  10;
    this.sunLight.shadow.bias          = -0.001;
    this.lightGroup.add(this.sunLight);

    this.fillLight = new THREE.DirectionalLight(0xd0e8ff, 0.45);
    this.fillLight.position.set(-5, 4, -3);
    this.lightGroup.add(this.fillLight);

    this.stripLight = new THREE.PointLight(0xffe8c0, 0.5, 3);
    this.stripLight.position.set(1.5, 1.35, 0.4);
    this.lightGroup.add(this.stripLight);
  }

  // ─── Habitación ───────────────────────────────────────────────────────────

  buildRoom(roomW: number, roomL: number, roomH: number) {
    // Snapshot hijos antes de limpiar — nunca mutar children durante iteración
    const children = [...this.roomGroup.children];
    children.forEach(c => {
      if (c instanceof THREE.Mesh) {
        c.geometry?.dispose();
        if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
        else c.material?.dispose();
      }
    });
    this.roomGroup.clear();

    const W    = roomW / 100;
    const L    = roomL / 100;
    const H    = roomH / 100;
    const WALL = 0.1;
    

    const floorMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee , roughness: 0.9, metalness: 0.04 });
    const wallMat  = new THREE.MeshStandardMaterial({ color: 0xf5f0ea, roughness: 1,   metalness: 0 });

    const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.02, L), floorMat);
    const center = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), wallMat);
    floor.position.set(W / 2, -0.01, L / 2);
    // center.position.set( WALL / 2, 2, WALL / 2);
    
    // floor.receiveShadow = true;
    this.roomGroup.add(floor);
    // this.roomGroup.add(center);

    // const wallBack = new THREE.Mesh(new THREE.BoxGeometry(W + WALL * 2, H, WALL), wallMat);
    // wallBack.position.set(W / 2, H / 2, -WALL / 2);
    // wallBack.receiveShadow = true;
    // this.roomGroup.add(wallBack);

    // const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(WALL, H, L + WALL * 2), wallMat);
    // wallLeft.position.set(-WALL / 2, H / 2, L / 2);
    // wallLeft.receiveShadow = true;
    // this.roomGroup.add(wallLeft);

    const grid = new THREE.GridHelper(Math.max(W, L) * 1.4, 24, 0x333340, 0x222230);
    grid.position.set(W / 2, 0.002, L / 2);
    this.helperGroup.add(grid);

    // Actualizar proyectDefaults para el cálculo dinámico de Y de muebles altos
    this.lowerCabH = 0.72; // podría venir del proyecto en el futuro

    this.camera.position.set(W * 0.85, H * 0.9, L * 1.1);
    this.camera.lookAt(W / 2, H * 0.3, L / 2);
  }

  // ─── Posicionamiento de grupos ────────────────────────────────────────────
  //
  // Sistema de coordenadas:
  //   startX / startY del LayoutGroup están en cm
  //   baseAngle en grados (0° = hacia +X, 90° = hacia +Z)
  //   connectionToNext determina el giro acumulado entre items
  //
  // Para cada item del grupo:
  //   curX, curZ acumulan la posición en el plano
  //   angleDeg acumula la dirección actual
  //
  // Las conexiones actúan DESPUÉS de colocar el item,
  // girando la dirección para el SIGUIENTE.

  private resolveGroupPositions(group: LayoutGroup): Array<{
    item:     QuoteItem;
    posX:     number;   // metros
    posY:     number;
    posZ:     number;
    rotY:     number;   // radianes
    instanceIndex: number;
  }> {
    const results: ReturnType<typeof this.resolveGroupPositions> = [];

    // El grupo puede tener posiciones pre-calculadas por layoutService
    // (almacenadas en posX/posZ de cada QuoteItem en cm).
    // Las usamos directamente y solo necesitamos añadir los offsets de categoría.

    for (const item of group.items) {
      const cat  = item.elementType.category as ElementCategory;
      const rotY = (-(item.rotationY * Math.PI))/ 180;


      // Instancia principal (index 0)
      results.push({
        item,
        posX: Math.cos(rotY)*(item.posX-item.width/2)/100 +Math.sin(rotY)*(item.width/2-item.posZ)/100,
        posY: 0 ,
        posZ: Math.cos(rotY)*(item.depth+item.posZ) /100 +Math.sin(rotY)*(item.posX-item.width/2)/100,
        rotY,
        instanceIndex: 0,
      });
      // results.push({
      //   item,
      //   posX: item.posX / 100 +Math.sin(rotY)*item.width/200-Math.sin(rotY)*item.depth/200 -(item.rotationY===-90?item.depth/200:0)-(item.rotationY===-180?item.width/100:0)-(item.rotationY===180?(item.width/100)+0.15:0),
      //   posY: 0 ,
      //   posZ: item.posZ / 100-Math.sin(rotY)*item.depth/200-Math.sin(rotY)*item.width/200+(item.rotationY===180?(item.depth/100):0)-(item.rotationY===-180?item.depth/100:0),
      //   rotY,
      //   instanceIndex: 0,
      // });

      // Instancias extra para quantity > 1
      // Se desplazan a lo largo de la dirección de rotación del item
      for (let i = 1; i < item.quantity; i++) {
        const widthM   = item.width / 100;
        const extraX   = item.posX / 100 + Math.cos(rotY) * widthM * i;
        const extraZ   = item.posZ / 100 + Math.sin(rotY) * widthM * i;

       

        results.push({
          item,
          posX: extraX,
          posY: 0,
          posZ: extraZ,
          rotY,
          instanceIndex: i,
        });
      }
    }
    console.log(results,"results")
    return results;
  }

  // ─── Helpers de posicionamiento ───────────────────────────────────────────



  private buildMaterialConfig(item: QuoteItem): MaterialConfig {
    const bodyComp   = item.components.find(c =>
      ["LATERAL", "TECHO", "PISO", "FONDO"].includes(c.componentType)
    );
    const finishComp = item.components.find(c =>
      ["PUERTA", "FRENTE_CAJON"].includes(c.componentType)
    );
    const mesonComp  = item.components.find(c => c.componentType === "MESON");
    const hw         = item.hardwareItems[0];
console.log("bodycompo",item)
    return {
      boardColor:           (bodyComp?.material?.color         ?? undefined) as MaterialConfig["boardColor"],
      boardTextureUrl:       bodyComp?.material?.textureUrl    ?? undefined,
      finishColor:          (finishComp?.surfaceFinish?.color  ?? finishComp?.material?.color ?? undefined) as MaterialConfig["finishColor"],
      finishTextureUrl:      finishComp?.surfaceFinish?.textureUrl ?? undefined,
      countertopColor:      (mesonComp?.material?.color        ?? undefined) as MaterialConfig["countertopColor"],
      countertopTextureUrl:  mesonComp?.material?.textureUrl   ?? undefined,
      handleColor:          (hw?.hardware ? "#c0a060"          : undefined)  as MaterialConfig["handleColor"],
      qualityTier:           hw?.hardware?.qualityTier         as MaterialConfig["qualityTier"] | undefined,
    };
  }

private buildParametricParams(item: QuoteItem): ParametricObjectParams2 {
  
  return {
    width: item.width,
    height: item.height,
    depth: item.depth,

    label: item.label ?? item.elementType.name,
    itemId: item.id,

    templates: item.components.map(c => ({
      id: c.id,
      componentType: c.componentType,
      label: c.label,
      elementTypeId:item.elementTypeId??"1111",

      widthFormula: c?.widthFormula??"T",
      heightFormula: c?.heightFormula??"H-ZO",
      depthFormula: c?.depthFormula??"D",
      thicknessMM:    c?.thicknessMM??"T",

      posXFormula: c?.posXFormula??"H-ZO",
      posYFormula: c?.posYFormula,
      posZFormula: c?.posZFormula,

      quantity: c.quantity,
      sortOrder: c?.sortOrder,

      topEdge: c?.topEdge,
      bottomEdge: c?.bottomEdge,
      leftEdge: c?.leftEdge,
      rightEdge: c?.rightEdge,
      defaultMaterial:c.material,
      materialId: c.materialId??"",

      defaultMaterialCategory: c.material?.category ?? "MELAMINA",
      defaultSurfaceFinishType: c.surfaceFinish?.type ?? "SIN_ACABADO",
    })),

    thicknessMM: item.thicknessMM ?? 18/10,
    backThicknessMM: item.backThicknessMM ?? 9/10,
    zocalo: item.zocalo ?? 7,
    assembly: (item.assemblyType ?? "LATERAL_PASANTE") as
      | "LATERAL_PASANTE"
      | "PISO_PASANTE",

    materialConfig: this.buildMaterialConfig(item),
  };
}

  // ─── Construcción desde proyecto ─────────────────────────────────────────

  buildFromProject(project: Project): void {
    // Limpiar estado anterior
    for (const state of this.itemState.values()) {
      this.itemsGroup.remove(state.primaryObj);
      state.primaryObj.dispose();
      for (const obj of state.extraObjs.values()) {
        this.itemsGroup.remove(obj);
        obj.dispose();
      }
    }
    this.itemState.clear();
    this.selectedId = null;

    const roomW = project.roomWidth  ?? 400;
    const roomL = project.roomLength ?? 320;
    const roomH = project.roomHeight ?? 260;
    this.buildRoom(roomW, roomL, roomH);

    for (const group of project.layoutGroups) {
      const placements = this.resolveGroupPositions(group);

      for (const placement of placements) {
        const { item, posX, posY, posZ, rotY, instanceIndex } = placement;
       const params = this.buildParametricParams(item);
       console.log(params?.materialConfig,"params")

const obj = new DynamicParametricObject(params);
        if (!obj) continue;

        obj.rotation.y = rotY;
        obj.position.set(posX, posY, posZ);
        // DynamicParametricObject handles materials individually from component templates
        // Do not apply global material config to avoid overriding component-specific colors
        this.itemsGroup.add(obj);

        if (instanceIndex === 0) {
          // Crear estado del item con la instancia principal
          const state: ItemState = {
            item,
            primaryObj: obj,
            extraObjs:  new Map(),
            lastUpdate: Date.now(),
          };
          this.itemState.set(item.id, state);
        } else {
          // Añadir al estado existente como instancia extra
          const state = this.itemState.get(item.id);
          if (state) state.extraObjs.set(instanceIndex, obj);
        }
      }
    }
  }

  // ─── Actualizar un item ───────────────────────────────────────────────────

  updateItem(item: QuoteItem): void {
    const state = this.itemState.get(item.id);
    if (!state) {
      // Item nuevo — reconstruir toda la escena es seguro pero costoso
      // Por ahora solo logueamos; buildFromProject se llamará tras onSettled
      console.warn("[KitchenScene] updateItem: item no encontrado en state", item.id);
      return;
    }

    const prev = state.item;

    // ── Dimensiones ─────────────────────────────────────────────────────────
    if (prev.width !== item.width || prev.height !== item.height || prev.depth !== item.depth) {
      state.primaryObj.setDimensions(item.width, item.height, item.depth);
      // Instancias extra tienen las mismas dimensiones
      for (const obj of state.extraObjs.values()) {
        obj.setDimensions(item.width, item.height, item.depth);
      }
    }

    // ── Posición y rotación ──────────────────────────────────────────────────
    if (prev.posX !== item.posX || prev.posZ !== item.posZ || prev.rotationY !== item.rotationY) {
      const rotY = (item.rotationY * Math.PI) / 180;

      state.primaryObj.position.set(item.posX / 100, 0, item.posZ / 100 );
      state.primaryObj.rotation.y = rotY;

      // Re-posicionar instancias extra
      let i = 1;
      for (const obj of state.extraObjs.values()) {
        const wM = item.width / 100;
        obj.position.set(
          item.posX / 100 + Math.cos(rotY) * wM * i,
       0,
          item.posZ / 100 + Math.sin(rotY) * wM * i ,
        );
        obj.rotation.y = rotY;
        i++;
      }
    }

    // ── Cantidad ─────────────────────────────────────────────────────────────
    if (prev.quantity !== item.quantity) {
      const yOff   =0;
      const zOff   = 0;
      const rotY   = (item.rotationY * Math.PI) / 180;
      const params = this.buildParametricParams(item);



      // Agregar instancias faltantes
      for (let i = state.extraObjs.size + 1; i < item.quantity; i++) {
      const obj = new DynamicParametricObject(params);
        if (!obj) continue;
        const wM = item.width / 100;
        obj.position.set(
          item.posX / 100 + Math.cos(rotY) * wM * i,
          yOff,
          item.posZ / 100 + Math.sin(rotY) * wM * i + zOff,
        );
        obj.rotation.y = rotY;
        // Skip applyMaterialConfig for DynamicParametricObject
        this.itemsGroup.add(obj);
        state.extraObjs.set(i, obj);
      }

      // Eliminar instancias sobrantes
      const keys = [...state.extraObjs.keys()].sort((a, b) => b - a);
      for (const k of keys) {
        if (k >= item.quantity) {
          const obj = state.extraObjs.get(k)!;
          this.itemsGroup.remove(obj);
          obj.dispose();
          state.extraObjs.delete(k);
        }
      }
    }

    // ── Materiales — siempre actualizar ─────────────────────────────────────
    // Skip for DynamicParametricObject as each component has its own material
    if (!(state.primaryObj instanceof DynamicParametricObject)) {
      const matConfig = this.buildMaterialConfig(item);
      state.primaryObj.applyMaterialConfig(matConfig);
      for (const obj of state.extraObjs.values()) {
        obj.applyMaterialConfig(matConfig);
      }
    }

    state.item       = item;
    state.lastUpdate = Date.now();
  }

  removeItem(itemId: string): void {
    const state = this.itemState.get(itemId);
    if (!state) return;

    this.itemsGroup.remove(state.primaryObj);
    state.primaryObj.dispose();
    for (const obj of state.extraObjs.values()) {
      this.itemsGroup.remove(obj);
      obj.dispose();
    }
    this.itemState.delete(itemId);
  }

  // ─── Selección ────────────────────────────────────────────────────────────

  handleClick(clientX: number, clientY: number, canvasRect: DOMRect): void {
    this.mouse.x =  ((clientX - canvasRect.left) / canvasRect.width)  * 2 - 1;
    this.mouse.y = -((clientY - canvasRect.top)  / canvasRect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const hits = this.raycaster.intersectObjects(this.itemsGroup.children, true);

    for (const hit of hits) {
      let obj: THREE.Object3D = hit.object;
      while (obj.parent && !obj.userData.kitchenObject) obj = obj.parent;

      if (obj.userData.kitchenObject && obj instanceof KitchenObject) {
        // itemId puede ser "id__2" para instancias extra — extraer el base id
        const rawId  = (obj.userData.itemId as string | undefined) ?? "";
        const baseId = rawId.split("__")[0] ?? rawId;

        // Deseleccionar anterior
        if (this.selectedId && this.selectedId !== baseId) {
          const prev = this.itemState.get(this.selectedId);
          if (prev) {
            prev.primaryObj.selected = false;
            for (const o of prev.extraObjs.values()) o.selected = false;
          }
        }

        if (this.selectedId === baseId) {
          // Clic sobre el mismo → deseleccionar
          obj.selected    = false;
          this.selectedId = null;
          this.onSelect?.(null, null);
        } else {
          obj.selected    = true;
          this.selectedId = baseId;
          this.onSelect?.(baseId, (obj.userData.label as string | undefined) ?? null);
        }
        return;
      }
    }

    // Clic en vacío → deseleccionar
    if (this.selectedId) {
      const prev = this.itemState.get(this.selectedId);
      if (prev) {
        prev.primaryObj.selected = false;
        for (const o of prev.extraObjs.values()) o.selected = false;
      }
      this.selectedId = null;
      this.onSelect?.(null, null);
    }
  }

  // ─── Modos de escena ──────────────────────────────────────────────────────

  setSceneMode(mode: SceneMode): void {
    this.sceneMode = mode;

    // Aplicar override de material a todos los meshes de items
    // THREE.WebGLRenderer no tiene .material.override — lo hacemos manualmente
    const mat: THREE.Material | null =
      mode === "WIREFRAME"
        ? new THREE.MeshBasicMaterial({ wireframe: true, color: 0xffffff })
        : mode === "BLUEPRINT"
        ? new THREE.MeshBasicMaterial({ wireframe: true, color: 0x0066cc })
        : null;

    if (this.wireframeOverride) {
      this.wireframeOverride.dispose();
      this.wireframeOverride = null;
    }
    this.wireframeOverride = mat;

    // Aplicar/quitar a todos los meshes dentro de itemsGroup
    this.itemsGroup.traverse(obj => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (mat) {
       obj.userData._originalMaterial ??= obj.material;
        obj.material = mat;
      } else {
        const orig = obj.userData._originalMaterial as THREE.Material | undefined;
        if (orig) {
          obj.material = orig;
          delete obj.userData._originalMaterial;
        }
      }
    });
  }

  // ─── UI helpers ───────────────────────────────────────────────────────────

  toggleGrid(visible: boolean): void {
    const grid = this.helperGroup.children.find(c => c instanceof THREE.GridHelper);
    if (grid) grid.visible = visible;
  }

  toggleRoom(visible: boolean): void {
    this.roomGroup.visible = visible;
  }

  // ─── Render loop ──────────────────────────────────────────────────────────

  animate(t: number): void {
    this.stripLight.intensity = 0.45 + Math.sin(t) * 0.07;
    this.render();
  }

  resize(w: number, h: number): void {
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    for (const state of this.itemState.values()) {
      state.primaryObj.dispose();
      for (const obj of state.extraObjs.values()) obj.dispose();
    }
    this.itemState.clear();

    // Limpiar grupos de room y helper manualmente
    [this.roomGroup, this.helperGroup].forEach(group => {
      const children = [...group.children];
      children.forEach(c => {
        if (c instanceof THREE.Mesh) {
          c.geometry?.dispose();
          if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
          else c.material?.dispose();
        }
      });
      group.clear();
    });

    if (this.wireframeOverride) this.wireframeOverride.dispose();
    this.renderer.dispose();
    this.scene.clear();
  }
}
