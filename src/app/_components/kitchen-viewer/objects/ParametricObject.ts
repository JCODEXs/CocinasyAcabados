/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-implied-eval */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import * as THREE from "three";
import type { ComponentTemplate } from "@prisma/client";

type FormulaContext = {
  W: number;  // ancho total (cm)
  H: number;  // alto total (cm)
  D: number;  // fondo total (cm)
  T: number;  // espesor tablero (cm)
  TF: number; // espesor fondo (cm)
  ZO: number; // zócalo (cm)
  IW: number; // ancho interno = W - 2*T
  ID: number; // fondo interno = D - TF
  IH: number; // alto interno (según assembly)
};


function evalFormula(formula: string, ctx: FormulaContext): number {
  if (!formula?.trim()) return 0;
  try {
    // Reemplazar todas las variables conocidas
    let expr = formula;
    for (const [key, value] of Object.entries(ctx)) {
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      expr = expr.replace(regex, String(value));
    }
    // Validar solo caracteres seguros
    if (!/^[\d\s+\-*/().]+$/.test(expr)) {
      throw new Error(`Invalid characters in formula: ${formula}`);
    }
    const result = Function(`"use strict"; return (${expr})`)();
    if (typeof result !== 'number' || !isFinite(result)) {
      throw new Error(`Formula result not a number: ${formula} -> ${result}`);
    }
    return Math.max(0, result);
  } catch (err) {
    console.warn(`Error evaluating formula "${formula}":`, err);
    return 0;
  }
}
function createEvalContext(
  W: number, H: number, D: number,
  thicknessMM: number, backThicknessMM: number,
  zocalo: number, assembly: "LATERAL_PASANTE" | "PISO_PASANTE"
): FormulaContext {
  const T = thicknessMM / 10;
  const TF = backThicknessMM / 10;
  const ZO = zocalo;
  const IW = W - 2 * T;
  const ID = D - TF;
  // IH depende del ensamble
  const IH = assembly === "LATERAL_PASANTE"
    ? H - ZO - T        // techo apoya sobre laterales
    : H - ZO - 2 * T;   // techo y piso son continuos
  return { W, H, D, T, TF, ZO, IW, ID, IH };
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

// function getHandleMaterial(
//   color: HexColor,
//   tier:  QualityTier,
// ): THREE.MeshStandardMaterial {
//   const metalness: Record<QualityTier, number> = {
//     ECONOMICO: 0.4,
//     ESTANDAR:  0.7,
//     PREMIUM:   0.85,
//     LUJO:      0.95,
//   };
//   const key = `handle_${color}_${tier}`;
//   let mat = materialCache.get(key);
//   if (!mat) {
//     mat = new THREE.MeshStandardMaterial({
//       color:     new THREE.Color(color),
//       roughness: 0.2,
//       metalness: metalness[tier],
//     });
//     materialCache.set(key, mat);
//   }
//   return mat;
// }

export type HexColor = `#${string}`;

export interface MaterialConfig {
  boardColor?: HexColor;
  finishColor?: HexColor;
  countertopColor?: HexColor;
  handleColor?: HexColor;
}

export interface ParametricObjectParams {
  width: number; // cm
  height: number;
  depth: number;

  thicknessMM: number;
  backThicknessMM: number;
  zocalo: number;

  assembly: "LATERAL_PASANTE" | "PISO_PASANTE";

  templates: ComponentTemplate[];

  materialConfig?: MaterialConfig;

  label?: string;
  itemId?: string;
  groupId?: string;
}

export interface EvalContext {
  W: number;
  H: number;
  D: number;
  T: number;
  IW: number;
  IH: number;
  ID: number;
  ZO: number;
}

export class ParametricObject extends THREE.Group {
  protected params: ParametricObjectParams;

  constructor(params: ParametricObjectParams) {
    super();

    this.params = params;

    this.build();

    if (params.materialConfig) {
      this.applyMaterialConfig(params.materialConfig);
    }
  }

  // =========================================================
  // BUILD FROM TEMPLATES
  // =========================================================

  private build(): void {
    const ctx = createEvalContext(
      this.params.width,
      this.params.height,
      this.params.depth,
      this.params.thicknessMM,
      this.params.backThicknessMM,
      this.params.zocalo,
      this.params.assembly
    );

    for (const template of this.params.templates) {
      this.buildTemplate(template, ctx);
    }
  }

  private buildTemplate(
    template: ComponentTemplate,
    ctx:FormulaContext,
  ): void {
    const w = evalFormula(template.widthFormula, ctx) / 100;
    const h = evalFormula(template.heightFormula, ctx) / 100;
    const d = evalFormula(template.depthFormula, ctx) / 100;

    const x = evalFormula(template.posXFormula, ctx) / 100;
    const y = evalFormula(template.posYFormula, ctx) / 100;
    const z = evalFormula(template.posZFormula, ctx) / 100;

    if (w <= 0 || h <= 0 || d <= 0) return;

    const material = this.resolveMaterial(template);

    const mesh = new THREE.Mesh(
      getBoxGeometry(w, h, d),
      material,
    );

    mesh.position.set(x, y, z);

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    this.add(mesh);
  }

  // =========================================================
  // MATERIAL RESOLUTION
  // =========================================================

  private resolveMaterial(
    template: ComponentTemplate,
  ): THREE.Material {
    switch (template.componentType) {
      case "MESON":
        return getStdMaterial("#555555");

      case "PUERTA":
      case "FRENTE_CAJON":
        return getStdMaterial("#d8c0a0");

      default:
        return getStdMaterial("#d8d0c4");
    }
  }

  // =========================================================
  // PUBLIC API
  // =========================================================

  setDimensions(
    width: number,
    height: number,
    depth: number,
  ): void {
    this.params.width = width;
    this.params.height = height;
    this.params.depth = depth;

    this.rebuild();
  }

  setTemplates(
    templates: ComponentTemplate[],
  ): void {
    this.params.templates = templates;
    this.rebuild();
  }

  private rebuild(): void {
    this.clear();

    this.build();
  }

  applyMaterialConfig(config: unknown): void {
    // your existing material override system
  }
}