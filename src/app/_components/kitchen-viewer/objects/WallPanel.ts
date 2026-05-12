import { KitchenObject } from "./KitchenObject";

export class WallPanel extends KitchenObject {
  protected build() {
    const { W, H, D } = this;
    const bd = this.defaultBoardMat();

    // Panel principal (panel yeso, superboard, etc.)
    this.addBox(W, H, D, bd, 0, H/2, 0, "board");

    // Junta perimetral (bordes)
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
    // Top edge
    this.addBox(W, 0.005, D + 0.002, edgeMat, 0, H, 0);
  }
}