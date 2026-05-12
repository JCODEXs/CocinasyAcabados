import * as THREE from "three";
import { KitchenObject, type KitchenObjectParams } from "./KitchenObject";

export interface UpperCabinetParams extends KitchenObjectParams {
  hasGlassDoors?: boolean;
  numShelves?: number;
}

export class UpperCabinet extends KitchenObject {
  private extraParams: UpperCabinetParams;

  constructor(params: UpperCabinetParams) {
    super(params);
    this.extraParams = params;
  }

  protected build() {
    const { W, H, D } = this;
    const bd = this.defaultBoardMat();
    const hd = this.defaultHandleMat();
    const hasGlass  = (this.params as UpperCabinetParams).hasGlassDoors ?? false;
    const numShelves= (this.params as UpperCabinetParams).numShelves ?? 1;

    // Laterales
    this.addBox(0.018, H, D, bd, -W/2 + 0.009, H/2, 0, "board");
    this.addBox(0.018, H, D, bd,  W/2 - 0.009, H/2, 0, "board");
    // Fondo
    this.addBox(W - 0.036, H, 0.018, bd, 0, H/2, -D/2 + 0.009, "board");
    // Techo
    this.addBox(W - 0.036, 0.018, D, bd, 0, H - 0.009, 0, "board");
    // Piso
    this.addBox(W - 0.036, 0.018, D, bd, 0, 0.009, 0, "board");

    // Entrepaños
    for (let i = 1; i <= numShelves; i++) {
      const y = H * (i / (numShelves + 1));
      this.addBox(W - 0.04, 0.016, D - 0.02, bd, 0, y, 0.01, "board");
    }

    // Puertas
    const doorH = H - 0.012;
    if (hasGlass) {
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x8ab8d0, roughness: 0.05, metalness: 0.05,
        transparent: true, opacity: 0.3,
      });
      if (W > 0.55) {
        // Marco exterior
        this.addBox(W/2 - 0.004, doorH, 0.016, this.defaultFinishMat(),
          -W/4, doorH/2 + 0.006, D/2 - 0.008, "finish");
        this.addBox(W/2 - 0.004, doorH, 0.016, this.defaultFinishMat(),
           W/4, doorH/2 + 0.006, D/2 - 0.008, "finish");
        // Vidrio
        const glassA = new THREE.Mesh(new THREE.BoxGeometry(W/2 - 0.02, doorH - 0.02, 0.005), glassMat);
        glassA.position.set(-W/4, doorH/2 + 0.006, D/2 - 0.001);
        this.add(glassA);
        const glassB = glassA.clone();
        glassB.position.set(W/4, doorH/2 + 0.006, D/2 - 0.001);
        this.add(glassB);
      } else {
        this.addBox(W - 0.006, doorH, 0.016, this.defaultFinishMat(),
          0, doorH/2 + 0.006, D/2 - 0.008, "finish");
        const glass = new THREE.Mesh(
          new THREE.BoxGeometry(W - 0.02, doorH - 0.02, 0.005), glassMat
        );
        glass.position.set(0, doorH/2 + 0.006, D/2 - 0.001);
        this.add(glass);
      }
    } else {
      if (W > 0.55) {
        this.addBox(W/2 - 0.004, doorH, 0.018, this.defaultFinishMat(),
          -W/4, doorH/2 + 0.006, D/2 - 0.009, "finish");
        this.addBox(W/2 - 0.004, doorH, 0.018, this.defaultFinishMat(),
           W/4, doorH/2 + 0.006, D/2 - 0.009, "finish");
        this.addCylinder(0.006, 0.08, hd, -W/4, doorH * 0.3, D/2 + 0.012, Math.PI/2);
        this.addCylinder(0.006, 0.08, hd,  W/4, doorH * 0.3, D/2 + 0.012, Math.PI/2);
      } else {
        this.addBox(W - 0.006, doorH, 0.018, this.defaultFinishMat(),
          0, doorH/2 + 0.006, D/2 - 0.009, "finish");
        this.addCylinder(0.006, 0.08, hd, 0, doorH * 0.3, D/2 + 0.012, Math.PI/2);
      }
    }
  }
}