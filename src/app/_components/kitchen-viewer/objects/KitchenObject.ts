/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import * as THREE from "three";

// ============================================
// TIPOS
// ============================================

export type HexColor = `#${string}`;

export const QUALITY_TIERS = {
  ECONOMICO: "ECONOMICO",
  ESTANDAR:  "ESTANDAR",
  PREMIUM:   "PREMIUM",
  LUJO:      "LUJO",
} as const;

export type QualityTier = (typeof QUALITY_TIERS)[keyof typeof QUALITY_TIERS];

export interface MaterialConfig {
  boardColor?:           HexColor;
  boardTextureUrl?:      string;
  finishColor?:          HexColor;
  finishTextureUrl?:     string;
  countertopColor?:      HexColor;
  countertopTextureUrl?: string;
  handleColor?:          HexColor;
  qualityTier?:          QualityTier;
}

export interface KitchenObjectParams {
  width:           number;   // cm
  height:          number;
  depth:           number;
  materialConfig?: MaterialConfig;
  label?:          string;
  groupId?:        string;
  itemId?:         string;
}

// Extensión de userData — Three.js lo declara como Record<string, any>
// así que no podemos re-declarar con declare, usamos una interfaz separada
export interface KitchenObjectUserData {
  kitchenObject: true;
  itemId?:       string;
  groupId?:      string;
  label:         string;
}

// ============================================
// CACHES GLOBALES (singletons por escena)
// ============================================

const geometryCache = new Map<string, THREE.BufferGeometry>();
const materialCache = new Map<string, THREE.MeshStandardMaterial>();
const textureCache  = new Map<string, THREE.Texture>();
const textureLoader = new THREE.TextureLoader();

function getBoxGeometry(w: number, h: number, d: number): THREE.BoxGeometry {
  const key = `box_${w.toFixed(4)}_${h.toFixed(4)}_${d.toFixed(4)}`;
  let geo = geometryCache.get(key) as THREE.BoxGeometry | undefined;
  if (!geo) {
    geo = new THREE.BoxGeometry(w, h, d);
    geometryCache.set(key, geo);
  }
  return geo;
}

function getCylinderGeometry(
  r: number,
  h: number,
  segments: number,
): THREE.CylinderGeometry {
  const key = `cyl_${r.toFixed(4)}_${h.toFixed(4)}_${segments}`;
  let geo = geometryCache.get(key) as THREE.CylinderGeometry | undefined;
  if (!geo) {
    geo = new THREE.CylinderGeometry(r, r, h, segments);
    geometryCache.set(key, geo);
  }
  return geo;
}

function loadTexture(url: string): THREE.Texture {
  const cached = textureCache.get(url);
  if (cached) return cached;
  const tex = textureLoader.load(url);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  textureCache.set(url, tex);
  return tex;
}

function getStdMaterial(
  color:      HexColor,
  textureUrl?: string,
  roughness    = 0.7,
  metalness    = 0.05,
): THREE.MeshStandardMaterial {
  const key = `std_${color}|${textureUrl ?? ""}|${roughness}|${metalness}`;
  let mat = materialCache.get(key);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness,
      metalness,
    });
    if (textureUrl) mat.map = loadTexture(textureUrl);
    materialCache.set(key, mat);
  }
  return mat;
}

function getHandleMaterial(
  color: HexColor,
  tier:  QualityTier,
): THREE.MeshStandardMaterial {
  const metalness: Record<QualityTier, number> = {
    ECONOMICO: 0.4,
    ESTANDAR:  0.7,
    PREMIUM:   0.85,
    LUJO:      0.95,
  };
  const key = `handle_${color}_${tier}`;
  let mat = materialCache.get(key);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color:     new THREE.Color(color),
      roughness: 0.2,
      metalness: metalness[tier],
    });
    materialCache.set(key, mat);
  }
  return mat;
}

/** Libera todos los caches — llamar al desmontar la escena completa */
export function disposeKitchenCaches(): void {
  geometryCache.forEach(g => g.dispose());
  materialCache.forEach(m => m.dispose());
  textureCache.forEach(t => t.dispose());
  geometryCache.clear();
  materialCache.clear();
  textureCache.clear();
}

// ============================================
// CLASE BASE
// ============================================

export abstract class KitchenObject extends THREE.Group {
  protected params: KitchenObjectParams;

  // Typed userData helper — accedemos vía getter para mantener tipado
  get kitchenData(): KitchenObjectUserData {
    return this.userData as KitchenObjectUserData;
  }

  // Meshes separados por categoría de material
  protected readonly boardMeshes:      THREE.Mesh[] = [];
  protected readonly finishMeshes:     THREE.Mesh[] = [];
  protected readonly countertopMeshes: THREE.Mesh[] = [];
  protected readonly handleMeshes:     THREE.Mesh[] = [];

  private _selected = false;
  private _selectionEdges?: THREE.LineSegments;

  constructor(params: KitchenObjectParams) {
    super();
    this.params = params;

    // userData es Record<string,any> en Three.js — asignamos con cast
    const ud = this.userData as KitchenObjectUserData;
    ud.kitchenObject = true;
    ud.itemId        = params.itemId;
    ud.groupId       = params.groupId;
    ud.label         = params.label ?? "Elemento";

    this.build();
    if (params.materialConfig) this.applyMaterialConfig(params.materialConfig);
  }

  // ─── API pública ─────────────────────────────────────────────────────────

  setDimensions(width: number, height: number, depth: number): void {
    if (
      this.params.width  === width  &&
      this.params.height === height &&
      this.params.depth  === depth
    ) return;

    this.params = { ...this.params, width, height, depth };
    this.rebuild();
  }

  applyMaterialConfig(config: MaterialConfig): void {
    this.params.materialConfig = config;

    if (config.boardColor ?? config.boardTextureUrl) {
      const mat = getStdMaterial(
        config.boardColor ?? "#d8d0c4",
        config.boardTextureUrl,
        0.7, 0.05,
      );
      this.boardMeshes.forEach(m => { m.material = mat; });
    }

    if (config.finishColor ?? config.finishTextureUrl) {
      const mat = getStdMaterial(
        config.finishColor ?? "#e8e0d4",
        config.finishTextureUrl,
        0.6, 0.05,
      );
      this.finishMeshes.forEach(m => { m.material = mat; });
    }

    if (config.countertopColor ?? config.countertopTextureUrl) {
      const mat = getStdMaterial(
        config.countertopColor ?? "#404855",
        config.countertopTextureUrl,
        0.3, 0.1,
      );
      this.countertopMeshes.forEach(m => { m.material = mat; });
    }

    if (config.handleColor) {
      const mat = getHandleMaterial(
        config.handleColor,
        config.qualityTier ?? "ESTANDAR",
      );
      this.handleMeshes.forEach(m => { m.material = mat; });
    }
  }

  get selected(): boolean { return this._selected; }
  set selected(v: boolean) {
    if (this._selected === v) return;
    this._selected = v;
    this.updateSelectionVisual();
  }

  /** Libera este objeto (no toca el cache global) */
  dispose(): void {
    this.clearMeshes();
    this.clear();
  }

  // ─── Para subclases ───────────────────────────────────────────────────────

  protected abstract build(): void;

  /** cm → metros (unidad de Three.js) */
  protected cm(v: number): number { return v / 100; }

  get W(): number { return this.cm(this.params.width);  }
  get H(): number { return this.cm(this.params.height); }
  get D(): number { return this.cm(this.params.depth);  }

  protected addBox(
    w: number, h: number, d: number,
    material: THREE.Material,
    x = 0, y = 0, z = 0,
    category: "board" | "finish" | "countertop" | "handle" | "none" = "none",
  ): THREE.Mesh {
    const geo  = getBoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.castShadow    = true;
    mesh.receiveShadow = true;
    this.add(mesh);

    switch (category) {
      case "board":      this.boardMeshes.push(mesh);      break;
      case "finish":     this.finishMeshes.push(mesh);     break;
      case "countertop": this.countertopMeshes.push(mesh); break;
      case "handle":     this.handleMeshes.push(mesh);     break;
    }
    return mesh;
  }

  protected addCylinder(
    radius: number, height: number,
    material: THREE.Material,
    x: number, y: number, z: number,
    rotZ = 0,
  ): THREE.Mesh {
    const geo  = getCylinderGeometry(radius, height, 12);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    if (rotZ !== 0) mesh.rotation.z = rotZ;
    mesh.castShadow = true;
    this.add(mesh);
    this.handleMeshes.push(mesh);
    return mesh;
  }

  // ─── Materiales por defecto (todos cacheados) ─────────────────────────────

  protected defaultBoardMat():      THREE.MeshStandardMaterial { return getStdMaterial("#d8d0c4", undefined, 0.75, 0.02); }
  protected defaultFinishMat():     THREE.MeshStandardMaterial { return getStdMaterial("#e8e0d8", undefined, 0.65, 0.03); }
  protected defaultCountertopMat(): THREE.MeshStandardMaterial { return getStdMaterial("#404855", undefined, 0.30, 0.08); }
  protected defaultHandleMat():     THREE.MeshStandardMaterial { return getHandleMaterial("#c0a060", "ESTANDAR"); }

  // ─── Lifecycle privado ────────────────────────────────────────────────────

  protected rebuild(): void {
    this.clearMeshes();
    this.build();
    if (this.params.materialConfig) {
      this.applyMaterialConfig(this.params.materialConfig);
    }
    if (this._selected) this.updateSelectionVisual();
  }

  private clearMeshes(): void {
    // Eliminar la selección antes de limpiar hijos
    if (this._selectionEdges) {
      this.remove(this._selectionEdges);
      this._selectionEdges.geometry.dispose();
      this._selectionEdges = undefined;
    }

    // Remover todos los meshes del grupo
    // Las geometrías y materiales NO se disposan — están en cache global
    const children = [...this.children];
    children.forEach(child => this.remove(child));

    // Vaciar arrays de categorías
    this.boardMeshes.length      = 0;
    this.finishMeshes.length     = 0;
    this.countertopMeshes.length = 0;
    this.handleMeshes.length     = 0;
  }

  private updateSelectionVisual(): void {
    // Limpiar selección anterior
    if (this._selectionEdges) {
      this.remove(this._selectionEdges);
      this._selectionEdges.geometry.dispose();
      this._selectionEdges = undefined;
    }

    if (!this._selected) return;

    // Calcular bounding box a partir de los meshes actuales
    const box = new THREE.Box3().setFromObject(this);

    if (box.isEmpty()) return;

    const size   = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Padding visual
    const PAD = 0.015;
    const edgesGeo = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(
        size.x + PAD,
        size.y + PAD,
        size.z + PAD,
      )
    );

    this._selectionEdges = new THREE.LineSegments(
      edgesGeo,
      new THREE.LineBasicMaterial({ color: 0xffcc44, linewidth: 1 }),
    );

    // Posicionar en el centro local del grupo
    const localCenter = this.worldToLocal(center.clone());
    this._selectionEdges.position.copy(localCenter);

    this.add(this._selectionEdges);
  }
}