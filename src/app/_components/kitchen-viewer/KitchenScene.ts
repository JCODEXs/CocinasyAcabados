/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import * as THREE from "three";
import type { RouterOutputs } from "@/trpc/react";
import { LowerCabinet }  from "./objects/LowerCabinet";
import { UpperCabinet }  from "./objects/UpperCabinet";
import { Island }        from "./objects/Island";
import { Appliance }     from "./objects/Appliance";
import { WallPanel }     from "./objects/WallPanel";
import { KitchenObject, type KitchenObjectParams, type MaterialConfig } from "./objects/KitchenObject";
import { DynamicParametricObject } from "./objects/DynamicParametricObject";

type Project    = RouterOutputs["quotes"]["getProject"];
type QuoteItem  = Project["layoutGroups"][number]["items"][number];
type LayoutGroup = Project["layoutGroups"][number];

// ─── Enums inline — nunca importar de @prisma/client en el cliente ───────────

type ElementCategory =
  | "MUEBLE_BAJO" | "MUEBLE_ALTO" | "MESON" | "ELECTRODOMESTICO"
  | "PANEL_YESO"  | "SUPERBOARD"  | "PUERTA" | "ESTANTE" | "OTRO"|"DINAMICO";

type SceneMode = "REALISTIC" | "WIREFRAME" | "BLUEPRINT";

// ─── Configuración de categorías ──────────────────────────────────────────────

interface PlacementConfig {
  yOffset:    number;   // metros sobre el suelo
  zOffset:    number;   // offset de profundidad respecto al punto del grupo
  objectType: "LOWER" | "UPPER" | "APPLIANCE" | "PANEL";
}

// Offset dinámico de Y para muebles altos:
// se calcula en runtime con las dimensiones del proyecto
const STATIC_Y_OFFSET: Record<ElementCategory, number> = {
  MUEBLE_BAJO:      0,
  MUEBLE_ALTO:      1.40,   // sobre-escrito dinámicamente en getItemYOffset
  MESON:            0,
  ELECTRODOMESTICO: 0,
  PANEL_YESO:       0,
  SUPERBOARD:       0,
  PUERTA:           0,
  ESTANTE:          1.40,
  OTRO:             0,
  DINAMICO:         0,
};

const STATIC_Z_OFFSET: Record<ElementCategory, number> = {
  MUEBLE_BAJO:      0,
  MUEBLE_ALTO:      0.125,  // retranqueo: mueble alto es menos profundo
  MESON:            0,
  ELECTRODOMESTICO: 0,
  PANEL_YESO:       0,
  SUPERBOARD:       0,
  PUERTA:           0,
  ESTANTE:          0.125,
  OTRO:             0,
  DINAMICO:         0,

};

// ─── Factory ──────────────────────────────────────────────────────────────────

type KitchenObjectCtor = new (params: KitchenObjectParams & Record<string, unknown>) => KitchenObject;

class KitchenObjectFactory {
  private static registry = new Map<ElementCategory, KitchenObjectCtor>();

  static register(cat: ElementCategory, ctor: KitchenObjectCtor) {
    this.registry.set(cat, ctor);
  }

  static create(cat: ElementCategory, params: KitchenObjectParams & Record<string, unknown>): KitchenObject | null {
    const Ctor = this.registry.get(cat);
    if (!Ctor) {
      console.warn(`[KitchenScene] No factory registered for category: ${cat}`);
      return new LowerCabinet(params); // fallback visible
    }
    return new Ctor(params);
  }
}

KitchenObjectFactory.register("MUEBLE_BAJO",      LowerCabinet as unknown as KitchenObjectCtor);
KitchenObjectFactory.register("MUEBLE_ALTO",      UpperCabinet as unknown as KitchenObjectCtor);
KitchenObjectFactory.register("MESON",            LowerCabinet as unknown as KitchenObjectCtor);
KitchenObjectFactory.register("ELECTRODOMESTICO", Appliance    as unknown as KitchenObjectCtor);
KitchenObjectFactory.register("PANEL_YESO",       WallPanel    as unknown as KitchenObjectCtor);
KitchenObjectFactory.register("SUPERBOARD",       WallPanel    as unknown as KitchenObjectCtor);
KitchenObjectFactory.register("PUERTA",           WallPanel    as unknown as KitchenObjectCtor);
KitchenObjectFactory.register("ESTANTE",          UpperCabinet as unknown as KitchenObjectCtor);
KitchenObjectFactory.register("OTRO",             LowerCabinet as unknown as KitchenObjectCtor);
KitchenObjectFactory.register("DINAMICO",         DynamicParametricObject as unknown as KitchenObjectCtor);


// ─── Estado por item ──────────────────────────────────────────────────────────

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
    floor.position.set(W / 2, -0.01, L / 2);
    floor.receiveShadow = true;
    this.roomGroup.add(floor);

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
      const yOff = this.getItemYOffset(cat);
      const zOff = STATIC_Z_OFFSET[cat];
      const rotY = (-(item.rotationY * Math.PI))/ 180;

      console.log(cat,"Category")

      // Instancia principal (index 0)
      results.push({
        item,
        posX: item.posX / 100 +Math.sin(rotY)*item.width/200-Math.sin(rotY)*item.depth/200 -(item.rotationY===-90?item.depth/200:0)-(item.rotationY===-180?item.width/100:0)-(item.rotationY===180?(item.width/100)+0.15:0),
        posY: yOff ,
        posZ: item.posZ / 100-Math.sin(rotY)*item.depth/200-Math.sin(rotY)*item.width/200+(item.rotationY===180?(item.depth/100):0)-(item.rotationY===-180?item.depth/100:0),
        rotY,
        instanceIndex: 0,
      });

      // Instancias extra para quantity > 1
      // Se desplazan a lo largo de la dirección de rotación del item
      for (let i = 1; i < item.quantity; i++) {
        const widthM   = item.width / 100;
        const extraX   = item.posX / 100 + Math.cos(rotY) * widthM * i;
        const extraZ   = item.posZ / 100 + Math.sin(rotY) * widthM * i;

       

        results.push({
          item,
          posX: extraX,
          posY: yOff,
          posZ: extraZ + zOff,
          rotY,
          instanceIndex: i,
        });
      }
    }
 console.log(results,"extraZ",group.items)
    return results;
  }

  // ─── Helpers de posicionamiento ───────────────────────────────────────────

  private getItemYOffset(cat: ElementCategory): number {
    if (cat === "MUEBLE_ALTO" || cat === "ESTANTE") {
      // Dinámico: altura del mueble bajo + mesón
      return this.lowerCabH + this.countertopH + 0.64;
    }
    return STATIC_Y_OFFSET[cat] ?? 0;
  }

  private buildMaterialConfig(item: QuoteItem): MaterialConfig {
    const bodyComp   = item.components.find(c =>
      ["LATERAL", "TECHO", "PISO", "FONDO"].includes(c.componentType)
    );
    const finishComp = item.components.find(c =>
      ["PUERTA", "FRENTE_CAJON"].includes(c.componentType)
    );
    const mesonComp  = item.components.find(c => c.componentType === "MESON");
    const hw         = item.hardwareItems[0];

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

  private buildObjectParams(item: QuoteItem): KitchenObjectParams & Record<string, unknown> {
    const cat   = item.elementType.category as ElementCategory;
    const model = item.elementType.threeJsModel;

    const params: KitchenObjectParams & Record<string, unknown> = {
      width:  item.width,
      height: item.height,
      depth:  item.depth,
      label:  item.label ?? item.elementType.name,
      itemId: item.id,
    };

    if (cat === "MUEBLE_ALTO" || cat === "ESTANTE") {
      params.hasGlassDoors = model === "UpperCabinetGlass";
      params.numShelves    = cat === "ESTANTE" ? 3 : (model === "UpperCabinetShelves" ? 2 : 1);
    }
    if (cat === "MESON") {
      params.height = 4; // mesón plano
    }
    if (cat === "ELECTRODOMESTICO") {
      params.applianceType =
        model === "Fridge" ? "REFRIGERADOR" :
        model === "Oven"   ? "HORNO"        :
        model === "Sink"   ? "LAVAPLATOS"   :
        model === "Hood"   ? "CAMPANA"      : "GENERICO";
    }
    return params;
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
        const cat    = item.elementType.category as ElementCategory;
        const params = this.buildObjectParams(item);
        const obj    = KitchenObjectFactory.create(cat, params);
        if (!obj) continue;

        obj.position.set(posX, posY, posZ);
        obj.rotation.y = rotY;
        obj.applyMaterialConfig(this.buildMaterialConfig(item));
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
      const cat  = item.elementType.category as ElementCategory;
      const yOff = this.getItemYOffset(cat);
      const zOff = STATIC_Z_OFFSET[cat] ?? 0;
      const rotY = (item.rotationY * Math.PI) / 180;

      state.primaryObj.position.set(item.posX / 100, yOff, item.posZ / 100 + zOff);
      state.primaryObj.rotation.y = rotY;

      // Re-posicionar instancias extra
      let i = 1;
      for (const obj of state.extraObjs.values()) {
        const wM = item.width / 100;
        obj.position.set(
          item.posX / 100 + Math.cos(rotY) * wM * i,
          yOff,
          item.posZ / 100 + Math.sin(rotY) * wM * i + zOff,
        );
        obj.rotation.y = rotY;
        i++;
      }
    }

    // ── Cantidad ─────────────────────────────────────────────────────────────
    if (prev.quantity !== item.quantity) {
      const cat    = item.elementType.category as ElementCategory;
      const yOff   = this.getItemYOffset(cat);
      const zOff   = STATIC_Z_OFFSET[cat] ?? 0;
      const rotY   = (item.rotationY * Math.PI) / 180;
      const params = this.buildObjectParams(item);

      // Agregar instancias faltantes
      for (let i = state.extraObjs.size + 1; i < item.quantity; i++) {
        const obj = KitchenObjectFactory.create(cat, params);
        if (!obj) continue;
        const wM = item.width / 100;
        obj.position.set(
          item.posX / 100 + Math.cos(rotY) * wM * i,
          yOff,
          item.posZ / 100 + Math.sin(rotY) * wM * i + zOff,
        );
        obj.rotation.y = rotY;
        obj.applyMaterialConfig(this.buildMaterialConfig(item));
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
    const matConfig = this.buildMaterialConfig(item);
    state.primaryObj.applyMaterialConfig(matConfig);
    for (const obj of state.extraObjs.values()) {
      obj.applyMaterialConfig(matConfig);
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