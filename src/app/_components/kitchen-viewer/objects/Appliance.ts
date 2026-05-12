import * as THREE from "three";
import { KitchenObject } from "./KitchenObject";

type ApplianceType = "REFRIGERADOR" | "HORNO" | "LAVAPLATOS" | "CAMPANA" | "GENERICO";

export class Appliance extends KitchenObject {
  private type: ApplianceType;

  constructor(params: KitchenObjectParams & { applianceType?: ApplianceType }) {
    super(params);
    this.type = params.applianceType ?? "GENERICO";
  }

  protected build() {
    const { W, H, D } = this;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x505058, roughness: 0.4, metalness: 0.65,
    });
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x606068, roughness: 0.3, metalness: 0.75,
    });

    // Cuerpo
    this.addBox(W, H, D, bodyMat, 0, H/2, 0, "board");

    // Panel frontal
    this.addBox(W * 0.9, H * 0.9, 0.008, panelMat,
      0, H/2, D/2 + 0.004, "finish");

    if (this.type === "REFRIGERADOR") this.buildFridge(W, H, D, panelMat);
    else if (this.type === "HORNO")    this.buildOven(W, H, D);
    else if (this.type === "LAVAPLATOS") this.buildSink(W, H, D);
    else if (this.type === "CAMPANA")  this.buildHood(W, H, D);
    else this.addCylinder(0.008, W * 0.5, this.defaultHandleMat(),
      0, H * 0.78, D/2 + 0.015, Math.PI/2);
  }

  private buildFridge(W: number, H: number, D: number, panelMat: THREE.Material) {
    const hd = this.defaultHandleMat();
    // División freezer / refrigerador
    this.addBox(W * 0.85, 0.01, 0.005, panelMat, 0, H * 0.7, D/2 + 0.005, "none");
    // Jaladores
    this.addCylinder(0.008, H * 0.28, hd, W/2 * 0.6, H * 0.85, D/2 + 0.018, 0);
    this.addCylinder(0.008, H * 0.5,  hd, W/2 * 0.6, H * 0.38, D/2 + 0.018, 0);
  }

  private buildOven(W: number, H: number, D: number) {
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a22, roughness: 0.05, metalness: 0.1,
      transparent: true, opacity: 0.7,
    });
    // Ventana del horno
    const win = new THREE.Mesh(new THREE.BoxGeometry(W * 0.7, H * 0.45, 0.006), glassMat);
    win.position.set(0, H * 0.45, D/2 + 0.005);
    this.add(win);
    // Tiradores
    this.addCylinder(0.007, W * 0.6, this.defaultHandleMat(),
      0, H * 0.72, D/2 + 0.015, Math.PI/2);
  }

  private buildSink(W: number, H: number, D: number) {
    // Cubierta de acero
    const sinkMat = new THREE.MeshStandardMaterial({
      color: 0x909090, roughness: 0.4, metalness: 0.7,
    });
    this.addBox(W * 0.85, 0.02, D * 0.75, sinkMat, 0, H - 0.01, 0, "countertop");
    // Fregadero empotrado (caja hundida)
    const bowl = new THREE.Mesh(
      new THREE.BoxGeometry(W * 0.4, 0.15, D * 0.55),
      new THREE.MeshStandardMaterial({ color: 0x7a7a7a, roughness: 0.3, metalness: 0.8 })
    );
    bowl.position.set(0, H - 0.08, 0);
    this.add(bowl);
  }

  private buildHood(W: number, H: number, D: number) {
    const hoodMat = new THREE.MeshStandardMaterial({
      color: 0x505055, roughness: 0.3, metalness: 0.8,
    });
    // Campana trapezoidal
    const pts = [
      new THREE.Vector2(-W/2, 0),
      new THREE.Vector2(W/2, 0),
      new THREE.Vector2(W * 0.35, H),
      new THREE.Vector2(-W * 0.35, H),
    ];
    const shape = new THREE.Shape(pts);
    const extrudeSettings = { depth: D * 0.8, bevelEnabled: false };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const hood = new THREE.Mesh(geo, hoodMat);
    hood.position.set(0, 0, -D * 0.4);
    hood.castShadow = true;
    this.add(hood);
  }
}