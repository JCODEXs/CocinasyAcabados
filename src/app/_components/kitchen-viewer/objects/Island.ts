/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { KitchenObject } from "./KitchenObject";

export class Island extends KitchenObject {
  protected build() {
    const { W, H, D } = this;
    const bd = this.defaultBoardMat();
    const ct = this.defaultCountertopMat();
    const hd = this.defaultHandleMat();
    const TOP_H    = 0.04;
    const PLINTH_H = 0.08;

    // Estructura de la isla — acceso desde 4 lados
    // Laterales largos (frente/fondo)
    this.addBox(W, H - PLINTH_H - TOP_H, 0.018, bd,
      0, (H - PLINTH_H - TOP_H)/2 + PLINTH_H, -D/2 + 0.009, "board");
    this.addBox(W, H - PLINTH_H - TOP_H, 0.018, bd,
      0, (H - PLINTH_H - TOP_H)/2 + PLINTH_H,  D/2 - 0.009, "finish");

    // Laterales cortos
    this.addBox(0.018, H - PLINTH_H - TOP_H, D, bd,
      -W/2 + 0.009, (H - PLINTH_H - TOP_H)/2 + PLINTH_H, 0, "board");
    this.addBox(0.018, H - PLINTH_H - TOP_H, D, bd,
       W/2 - 0.009, (H - PLINTH_H - TOP_H)/2 + PLINTH_H, 0, "finish");

    // Piso + techo internos
    this.addBox(W - 0.036, 0.018, D - 0.036, bd, 0, PLINTH_H + 0.009, 0, "board");
    this.addBox(W - 0.036, 0.018, D - 0.036, bd, 0, H - TOP_H - 0.009, 0, "board");

    // Zócalo
    this.addBox(W, PLINTH_H, D, bd, 0, PLINTH_H/2, 0, "board");

    // Puertas en los 4 lados (frentes decorativos)
    const doorH = H - PLINTH_H - TOP_H - 0.006;
    const cy = PLINTH_H + doorH/2 + 0.003;

    // Frente
    this.addBox(W - 0.006, doorH, 0.016, this.defaultFinishMat(),
      0, cy,  D/2 - 0.008, "finish");
    // Fondo
    this.addBox(W - 0.006, doorH, 0.016, this.defaultFinishMat(),
      0, cy, -D/2 + 0.008, "finish");
    // Izquierda
    this.addBox(0.016, doorH, D - 0.006, this.defaultFinishMat(),
      -W/2 + 0.008, cy, 0, "finish");
    // Derecha
    this.addBox(0.016, doorH, D - 0.006, this.defaultFinishMat(),
       W/2 - 0.008, cy, 0, "finish");

    // Jaladores en los 4 lados
    this.addCylinder(0.007, Math.min(W * 0.5, 0.18), hd,
      0, cy + doorH * 0.15,  D/2 + 0.012, Math.PI/2);
    this.addCylinder(0.007, Math.min(W * 0.5, 0.18), hd,
      0, cy + doorH * 0.15, -D/2 - 0.012, Math.PI/2);
    this.addCylinder(0.007, Math.min(D * 0.5, 0.18), hd,
      -W/2 - 0.012, cy + doorH * 0.15, 0, 0);
    this.addCylinder(0.007, Math.min(D * 0.5, 0.18), hd,
       W/2 + 0.012, cy + doorH * 0.15, 0, 0);

    // Mesón (granito o cuarzo)
    this.addBox(W + 0.06, TOP_H, D + 0.06, ct, 0, H - TOP_H/2, 0, "countertop");
  }
}