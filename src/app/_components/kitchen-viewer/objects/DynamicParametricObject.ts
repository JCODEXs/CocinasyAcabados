/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-implied-eval */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { ComponentTemplate, ComponentType } from "@prisma/client";
import { KitchenObject, type KitchenObjectParams } from "./KitchenObject";
// interface ParametricParams extends KitchenObjectParams {
//   templates: ComponentTemplate[]; // Los paneles que vienen de tu API
// }

// export class DynamicParametricObject extends KitchenObject {
//   templates: ComponentTemplate[];

//   constructor(params: ParametricParams) {
//     super(params);
//     this.templates = params.templates;
//     this.initialize();
//   }

//   protected build() {
//     const { W, H, D } = this;
    
//     // Función evaluadora interna (similar a la del dashboard)
//     const evalF = (formula: string) => {
//       const parsed = formula.replace(/W/g, W.toString()).replace(/H/g, H.toString()).replace(/D/g, D.toString());
//       return new Function(`return ${parsed}`)();
//     };

//     this.templates.forEach(panel => {
//       const w = evalF(panel.widthFormula);
//       const h = evalF(panel.heightFormula);
//       const d = evalF(panel.depthFormula);
//       const x = evalF(panel.posXFormula);
//       const y = evalF(panel.posYFormula);
//       const z = evalF(panel.posZFormula);
//       const componentType="board"

//       // Determinar material según el defaultMaterialCategory del panel
//       let material = this.defaultBoardMat();
//       if (panel.componentType === "PUERTA") material = this.defaultFinishMat();
//       if (panel.componentType === "MESON") material = this.defaultCountertopMat();

//       // Usar tu método existente addBox
//       this.addBox(w, h, d, material, x, y, z, componentType );
//     });
//   }
// }


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

function evaluateFormula(formula: string, ctx: FormulaContext): number {
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
    return Math.max(-2000, result);
  } catch (err) {
    console.warn(`Error evaluating formula "${formula}":`, err);
    return 0;
  }
}
function buildContext(
  W: number, H: number, D: number,
  thicknessMM: number, backThicknessMM: number,
  zocalo: number, assembly: "LATERAL_PASANTE" | "PISO_PASANTE"
): FormulaContext {
  const T = thicknessMM;
  const TF = backThicknessMM;
  const ZO = zocalo;
  const IW = W - 2 * T;
  const ID = D - TF;
  // IH depende del ensamble
  const IH = assembly === "LATERAL_PASANTE"
    ? H - ZO - T        // techo apoya sobre laterales
    : H - ZO - 2 * T;   // techo y piso son continuos
    
  return { W, H, D, T, TF, ZO, IW, ID, IH };
}
interface ParametricParams extends KitchenObjectParams {
  templates: ComponentTemplate[];
  // nuevos parámetros
  thicknessMM: number;
  backThicknessMM: number;
  zocalo: number;
  assembly: "LATERAL_PASANTE" | "PISO_PASANTE";
}

export class DynamicParametricObject extends KitchenObject {
  private templates: ComponentTemplate[];
  private config: Omit<ParametricParams, keyof KitchenObjectParams | 'templates'>;

  constructor(params: ParametricParams) {
    super(params);
    this.templates = params.templates;
    this.config = {
      thicknessMM: params.thicknessMM,
      backThicknessMM: params.backThicknessMM,
      zocalo: params.zocalo,
      assembly: params.assembly,
    };
    console.log(this.templates?.[0],"templates",params)
    this.initialize();
  }

  protected build() {
    const { W, H, D } = this;
    const ctx = buildContext(
      W*100, H*100, D*100,
      this.config.thicknessMM/10,
      this.config.backThicknessMM/10,
      this.config.zocalo,
      this.config.assembly
    );
    console.log(this.templates,ctx,"context")

    this.templates.forEach(panel => {
      const w = evaluateFormula(panel.widthFormula, ctx)/100;
      const h = evaluateFormula(panel.heightFormula, ctx)/100;
      const d = evaluateFormula(panel.depthFormula, ctx)/100;
      const x = (evaluateFormula(panel.posXFormula, ctx)/100);
      const y = evaluateFormula(panel.posYFormula, ctx)/100;
      const z = (evaluateFormula(panel.posZFormula, ctx)/100)

      if (w <= 0 || h <= 0 || d <= 0) return;

      let material: THREE.MeshStandardMaterial | undefined;
      let category: "board" | "finish" | "countertop" | "handle" | "none" = "board";

      // Determinar material y categoría según tipo de componente
      if (panel.componentType === "PUERTA" || panel.componentType === "FRENTE_CAJON") {
        category = "finish";
        // Si panel tiene material, usar su color; si no, usar default
        if (panel.defaultMaterial?.color) {
          material = this.getMaterialFromColor(panel.defaultMaterial.color as string, 0.65, 0.03);
        } else {
          material = this.defaultFinishMat();
        }
      } else if (panel.componentType === "MESON") {
        category = "countertop";
        if (panel.defaultMaterial?.color) {
          material = this.getMaterialFromColor(panel.defaultMaterial.color as string, 0.30, 0.08);
        } else {
          material = this.defaultCountertopMat();
        }
      } else {
        category = "board";
        // Para tableros: usar color del material asignado
        if (panel.defaultMaterial?.color) {
          material = this.getMaterialFromColor(panel.defaultMaterial.color as string, 0.75, 0.02);
        } else {
          material = this.defaultBoardMat();
        }
      }

      if (material) {
        this.addBox(w, h, d, material, x, y, z, category);
      }
    });
  }
}