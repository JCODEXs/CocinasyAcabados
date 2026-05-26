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
    return Math.max(0, result);
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
    this.initialize();
  }

  protected build() {
    const { W, H, D } = this;
    const ctx = buildContext(
      W, H, D,
      this.config.thicknessMM,
      this.config.backThicknessMM,
      this.config.zocalo,
      this.config.assembly
    );

    this.templates.forEach(panel => {
      const w = evaluateFormula(panel.widthFormula, ctx);
      const h = evaluateFormula(panel.heightFormula, ctx);
      const d = evaluateFormula(panel.depthFormula, ctx);
      const x = evaluateFormula(panel.posXFormula, ctx);
      const y = evaluateFormula(panel.posYFormula, ctx);
      const z = evaluateFormula(panel.posZFormula, ctx);

      if (w <= 0 || h <= 0 || d <= 0) return;

      let material = this.defaultBoardMat();
      if (panel.componentType === "PUERTA") material = this.defaultFinishMat();
      if (panel.componentType === "MESON") material = this.defaultCountertopMat();

      this.addBox(w, h, d, material, x, y, z, "board");
    });
  }
}