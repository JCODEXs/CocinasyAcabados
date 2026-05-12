import * as THREE from "three";

export interface KitchenObjectParams {
  width:  number;  // cm → convertimos a metros (/100)
  height: number;
  depth:  number;
  materialConfig?: MaterialConfig;
  label?: string;
  groupId?: string;
  itemId?: string;
}

export interface MaterialConfig {
  boardColor?:       string;   // hex
  boardTextureUrl?:  string;
  finishColor?:      string;
  finishTextureUrl?: string;
  countertopColor?:  string;
  countertopTextureUrl?: string;
  handleColor?:      string;
  qualityTier?: "ECONOMICO" | "ESTANDAR" | "PREMIUM" | "LUJO";
}

export abstract class KitchenObject extends THREE.Group {
  protected params: KitchenObjectParams;
  // Meshes que responden a cambio de material
  protected boardMeshes:       THREE.Mesh[] = [];
  protected finishMeshes:      THREE.Mesh[] = [];
  protected countertopMeshes:  THREE.Mesh[] = [];
  protected handleMeshes:      THREE.Mesh[] = [];

  // Estado de selección
  private _selected = false;
  private _selectionBox?: THREE.LineSegments;

  constructor(params: KitchenObjectParams) {
    super();
    this.params = params;
    this.userData.kitchenObject = true;
    this.userData.itemId  = params.itemId;
    this.userData.groupId = params.groupId;
    this.userData.label   = params.label ?? "Elemento";
    this.build();
    if (params.materialConfig) this.applyMaterialConfig(params.materialConfig);
  }

  // ─── API pública ─────────────────────────────────────────────────────────

  /** Re-construye la geometría con nuevas dimensiones */
  setDimensions(width: number, height: number, depth: number) {
    this.params = { ...this.params, width, height, depth };
    this.clear();
    this.boardMeshes      = [];
    this.finishMeshes     = [];
    this.countertopMeshes = [];
    this.handleMeshes     = [];
    this._selectionBox    = undefined;
    this.build();
    if (this.params.materialConfig) {
      this.applyMaterialConfig(this.params.materialConfig);
    }
  }

  /** Aplica colores/texturas a los meshes del objeto */
  applyMaterialConfig(config: MaterialConfig) {
    this.params.materialConfig = config;

    if (config.boardColor || config.boardTextureUrl) {
      const mat = this.makeStdMaterial(config.boardColor ?? "#d8d0c4", config.boardTextureUrl, 0.7, 0.05);
      this.boardMeshes.forEach(m => { m.material = mat; });
    }
    if (config.finishColor || config.finishTextureUrl) {
      const mat = this.makeStdMaterial(config.finishColor ?? "#e8e0d4", config.finishTextureUrl, 0.6, 0.05);
      this.finishMeshes.forEach(m => { m.material = mat; });
    }
    if (config.countertopColor || config.countertopTextureUrl) {
      const mat = this.makeStdMaterial(config.countertopColor ?? "#404855", config.countertopTextureUrl, 0.3, 0.1);
      this.countertopMeshes.forEach(m => { m.material = mat; });
    }
    if (config.handleColor) {
      const tier = config.qualityTier ?? "ESTANDAR";
      const metalness = { ECONOMICO: 0.4, ESTANDAR: 0.7, PREMIUM: 0.85, LUJO: 0.95 }[tier];
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(config.handleColor),
        roughness: 0.2,
        metalness,
      });
      this.handleMeshes.forEach(m => { m.material = mat; });
    }
  }

  set selected(v: boolean) {
    this._selected = v;
    this._updateSelectionVisual();
  }
  get selected() { return this._selected; }

  // ─── Para subclases ───────────────────────────────────────────────────────

  /** Cada subclase implementa su propia geometría */
  protected abstract build(): void;

  /** Convierte cm a metros (unidad de Three.js) */
  protected cm(v: number): number { return v / 100; }
  get W(): number { return this.cm(this.params.width);  }
  get H(): number { return this.cm(this.params.height); }
  get D(): number { return this.cm(this.params.depth);  }

  /** Crea un mesh tipo caja y lo añade al grupo */
  protected addBox(
    w: number, h: number, d: number,
    mat: THREE.Material,
    x = 0, y = 0, z = 0,
    category: "board" | "finish" | "countertop" | "handle" | "none" = "none"
  ): THREE.Mesh {
    const geo  = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.add(mesh);
    if (category === "board")      this.boardMeshes.push(mesh);
    if (category === "finish")     this.finishMeshes.push(mesh);
    if (category === "countertop") this.countertopMeshes.push(mesh);
    if (category === "handle")     this.handleMeshes.push(mesh);
    return mesh;
  }

  /** Crea un cilindro (para jaladores/manijas) */
  protected addCylinder(
    r: number, h: number, mat: THREE.Material,
    x: number, y: number, z: number,
    rotZ = 0
  ): THREE.Mesh {
    const geo  = new THREE.CylinderGeometry(r, r, h, 12);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    if (rotZ) mesh.rotation.z = rotZ;
    mesh.castShadow = true;
    this.add(mesh);
    this.handleMeshes.push(mesh);
    return mesh;
  }

  // ─── Materiales por defecto ───────────────────────────────────────────────

  protected defaultBoardMat(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({ color: 0xd8d0c4, roughness: 0.75, metalness: 0.02 });
  }
  protected defaultFinishMat(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({ color: 0xe8e0d8, roughness: 0.65, metalness: 0.03 });
  }
  protected defaultCountertopMat(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({ color: 0x404855, roughness: 0.3, metalness: 0.08 });
  }
  protected defaultHandleMat(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({ color: 0xc0a060, roughness: 0.2, metalness: 0.8 });
  }

  protected makeStdMaterial(
    color: string, textureUrl?: string, roughness = 0.7, metalness = 0.05
  ): THREE.MeshStandardMaterial {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color), roughness, metalness,
    });
    if (textureUrl) {
      const loader = new THREE.TextureLoader();
      loader.load(textureUrl, (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 2);
        mat.map = tex;
        mat.needsUpdate = true;
      });
    }
    return mat;
  }

  // ─── Selección visual ─────────────────────────────────────────────────────

  private _updateSelectionVisual() {
    if (this._selectionBox) {
      this.remove(this._selectionBox);
      this._selectionBox = undefined;
    }
    if (!this._selected) return;

    const bb = new THREE.Box3().setFromObject(this);
    const size   = new THREE.Vector3(); bb.getSize(size);
    const center = new THREE.Vector3(); bb.getCenter(center);

    const geo = new THREE.BoxGeometry(size.x + 0.02, size.y + 0.02, size.z + 0.02);
    const edges = new THREE.EdgesGeometry(geo);
    this._selectionBox = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0xffcc44, linewidth: 1 })
    );
    // Convertir center a local del grupo
    const localCenter = this.worldToLocal(center.clone());
    this._selectionBox.position.copy(localCenter);
    this.add(this._selectionBox);
  }
}