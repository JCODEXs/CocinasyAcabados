/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import * as THREE from "three";
import { KitchenObject, type KitchenObjectParams } from "./KitchenObject";

export class LowerCabinet extends KitchenObject {
   constructor(params: KitchenObjectParams) {
    super(params);

    this.initialize();
  }
  protected build() {
    const { W, H, D } = this;
    const bd = this.defaultBoardMat();
    const ct = this.defaultCountertopMat();
    const hd = this.defaultHandleMat();
    const PLINTH_H = 0.08;
    const TOP_H    = 0.03;

    // ── Cuerpo principal ─────────────────────────────────────────────────
    // Laterales (2)
    this.addBox(0.018, H - PLINTH_H - TOP_H, D, bd,
      -W/2 + 0.009, (H - PLINTH_H - TOP_H)/2 + PLINTH_H, 0, "board");
    this.addBox(0.018, H - PLINTH_H - TOP_H, D, bd,
       W/2 - 0.009, (H - PLINTH_H - TOP_H)/2 + PLINTH_H, 0, "board");

    // Fondo
    this.addBox(W - 0.036, H - PLINTH_H - TOP_H, 0.018, bd,
      0, (H - PLINTH_H - TOP_H)/2 + PLINTH_H, -D/2 + 0.009, "board");

    // Techo interno
    this.addBox(W - 0.036, 0.018, D, bd,
      0, H - TOP_H - 0.009, 0, "board");

    // Piso interno
    this.addBox(W - 0.036, 0.018, D, bd,
      0, PLINTH_H + 0.009, 0, "board");

    // ── Zócalo / plinto ──────────────────────────────────────────────────
    this.addBox(W, PLINTH_H, D * 0.6, bd,
      0, PLINTH_H/2, D * 0.2, "board");

    // ── Puertas (frentes) ────────────────────────────────────────────────
    const doorH = H - PLINTH_H - TOP_H - 0.006;
    const doorW = W > 0.6 ? W/2 - 0.004 : W - 0.006;

    if (W > 0.6) {
      // Dos puertas
      this.addBox(doorW, doorH, 0.018, this.defaultFinishMat(),
        -W/4, PLINTH_H + doorH/2 + 0.003, D/2 - 0.009, "finish");
      this.addBox(doorW, doorH, 0.018, this.defaultFinishMat(),
         W/4, PLINTH_H + doorH/2 + 0.003, D/2 - 0.009, "finish");

      // Jaladores
      this.addCylinder(0.007, 0.12, hd,
        -W/4, PLINTH_H + doorH * 0.6, D/2 + 0.015, Math.PI/2);
      this.addCylinder(0.007, 0.12, hd,
         W/4, PLINTH_H + doorH * 0.6, D/2 + 0.015, Math.PI/2);
    } else {
      // Una puerta
      this.addBox(doorW, doorH, 0.018, this.defaultFinishMat(),
        0, PLINTH_H + doorH/2 + 0.003, D/2 - 0.009, "finish");
      this.addCylinder(0.007, 0.1, hd,
        0, PLINTH_H + doorH * 0.6, D/2 + 0.015, Math.PI/2);
    }

    // ── Mesón ────────────────────────────────────────────────────────────
    this.addBox(W + 0.02, TOP_H, D + 0.04, ct,
      0, H - TOP_H/2, 0.02, "countertop");
     
  }
}