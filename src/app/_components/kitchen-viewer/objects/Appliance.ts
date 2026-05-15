/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import * as THREE from "three";
import {
  KitchenObject,
  type KitchenObjectParams,
} from "./KitchenObject";

type ApplianceType =
  | "REFRIGERADOR"
  | "HORNO"
  | "LAVAPLATOS"
  | "CAMPANA"
  | "GENERICO";

interface ApplianceParams extends KitchenObjectParams {
  applianceType?: ApplianceType;
}

export class Appliance extends KitchenObject {
  public readonly type: ApplianceType;

  constructor(params: ApplianceParams) {
    super(params);

    this.type = params.applianceType ?? "GENERICO";

    // this.initialize();
  }

  protected build(): void {
    const W = this.W;
    const H = this.H;
    const D = this.D;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x505058,
      roughness: 0.4,
      metalness: 0.65,
    });

    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x606068,
      roughness: 0.3,
      metalness: 0.75,
    });

    // Cuerpo
    this.addBox(
      W,
      H,
      D,
      bodyMat,
      0,
      H / 2,
      0,
      "board"
    );

    // Panel frontal
    this.addBox(
      W * 0.9,
      H * 0.9,
      0.008,
      panelMat,
      0,
      H / 2,
      D / 2 + 0.004,
      "finish"
    );

    switch (this.type) {
      case "REFRIGERADOR":
        this.buildFridge(W, H, D, panelMat);
        break;

      case "HORNO":
        this.buildOven(W, H, D);
        break;

      case "LAVAPLATOS":
        this.buildSink(W, H, D);
        break;

      case "CAMPANA":
        this.buildHood(W, H, D);
        break;

      default:
        this.addCylinder(
          0.008,
          W * 0.5,
          this.defaultHandleMat(),
          0,
          H * 0.78,
          D / 2 + 0.015,
          Math.PI / 2
        );
    }
  }

  private buildFridge(
    W: number,
    H: number,
    D: number,
    panelMat: THREE.Material
  ): void {
    const handleMat = this.defaultHandleMat();

    // División freezer/refrigerador
    this.addBox(
      W * 0.85,
      0.01,
      0.005,
      panelMat,
      0,
      H * 0.7,
      D / 2 + 0.005
    );

    // Jaladores
    this.addCylinder(
      0.008,
      H * 0.28,
      handleMat,
      W * 0.3,
      H * 0.85,
      D / 2 + 0.018
    );

    this.addCylinder(
      0.008,
      H * 0.5,
      handleMat,
      W * 0.3,
      H * 0.38,
      D / 2 + 0.018
    );
  }

  private buildOven(
    W: number,
    H: number,
    D: number
  ): void {
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a22,
      roughness: 0.05,
      metalness: 0.1,
      transparent: true,
      opacity: 0.7,
    });

    const windowMesh = new THREE.Mesh(
      new THREE.BoxGeometry(
        W * 0.7,
        H * 0.45,
        0.006
      ),
      glassMat
    );

    windowMesh.position.set(
      0,
      H * 0.45,
      D / 2 + 0.005
    );

    windowMesh.castShadow = true;

    this.add(windowMesh);

    this.addCylinder(
      0.007,
      W * 0.6,
      this.defaultHandleMat(),
      0,
      H * 0.72,
      D / 2 + 0.015,
      Math.PI / 2
    );
  }

  private buildSink(
    W: number,
    H: number,
    D: number
  ): void {
    const sinkMat = new THREE.MeshStandardMaterial({
      color: 0x909090,
      roughness: 0.4,
      metalness: 0.7,
    });

    this.addBox(
      W * 0.85,
      0.02,
      D * 0.75,
      sinkMat,
      0,
      H - 0.01,
      0,
      "countertop"
    );

    const bowlMat = new THREE.MeshStandardMaterial({
      color: 0x7a7a7a,
      roughness: 0.3,
      metalness: 0.8,
    });

    const bowl = new THREE.Mesh(
      new THREE.BoxGeometry(
        W * 0.4,
        0.15,
        D * 0.55
      ),
      bowlMat
    );

    bowl.position.set(
      0,
      H - 0.08,
      0
    );

    bowl.castShadow = true;
    bowl.receiveShadow = true;

    this.add(bowl);
  }

  private buildHood(
    W: number,
    H: number,
    D: number
  ): void {
    const hoodMat = new THREE.MeshStandardMaterial({
      color: 0x505055,
      roughness: 0.3,
      metalness: 0.8,
    });

    const shape = new THREE.Shape([
      new THREE.Vector2(-W / 2, 0),
      new THREE.Vector2(W / 2, 0),
      new THREE.Vector2(W * 0.35, H),
      new THREE.Vector2(-W * 0.35, H),
    ]);

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: D * 0.8,
      bevelEnabled: false,
    });

    const hood = new THREE.Mesh(
      geometry,
      hoodMat
    );

    hood.position.set(
      0,
      0,
      -D * 0.4
    );

    hood.castShadow = true;
    hood.receiveShadow = true;

    this.add(hood);
  }
}