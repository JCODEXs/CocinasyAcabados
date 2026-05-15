/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import * as THREE from "three";

interface OrbitState {
  theta:  number;
  phi:    number;
  radius: number;
  target: THREE.Vector3;
}

export class SimpleOrbitControls {
  private state: OrbitState;
  private dragging = false;
  private rightDrag = false;
  private lastX = 0;
  private lastY = 0;
  private _enabled = true;

  constructor(
    private camera: THREE.PerspectiveCamera,
    private domEl:  HTMLElement
  ) {
    this.state = {
      theta: Math.PI / 4, phi: Math.PI / 3.5,
      radius: 7, target: new THREE.Vector3(2, 0.8, 1.5),
    };
    this.bind();
    this.update();
  }

  set enabled(v: boolean) { this._enabled = v; }

  setTarget(x: number, y: number, z: number) {
    this.state.target.set(x, y, z);
    this.update();
  }

  setView(preset: "perspective" | "top" | "front") {
    if (preset === "top") {
      this.state.theta = 0; this.state.phi = 0.05; this.state.radius = 9;
    } else if (preset === "front") {
      this.state.theta = 0; this.state.phi = Math.PI/2.2; this.state.radius = 6;
    } else {
      this.state.theta = Math.PI/4; this.state.phi = Math.PI/3.5; this.state.radius = 7;
    }
    this.update();
  }

  private update() {
    const { theta, phi, radius, target } = this.state;
    this.camera.position.set(
      target.x + radius * Math.sin(phi) * Math.sin(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * Math.sin(phi) * Math.cos(theta)
    );
    this.camera.lookAt(target);
  }

  private bind() {
    this.domEl.addEventListener("mousedown", this.onDown);
    this.domEl.addEventListener("contextmenu", e => e.preventDefault());
    window.addEventListener("mousemove", this.onMove);
    window.addEventListener("mouseup", () => { this.dragging = false; });
    this.domEl.addEventListener("wheel", this.onWheel, { passive: false });

    // Touch
    let lastTouchDist = 0;
    this.domEl.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        this.dragging = true; this.rightDrag = false;
        this.lastX = e.touches[0]!.clientX;
        this.lastY = e.touches[0]!.clientY;
      } else if (e.touches.length === 2) {
        lastTouchDist = Math.hypot(
          e.touches[0]!.clientX - e.touches[1]!.clientX,
          e.touches[0]!.clientY - e.touches[1]!.clientY
        );
      }
    });
    this.domEl.addEventListener("touchmove", (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && this.dragging) {
        const dx = e.touches[0]!.clientX - this.lastX;
        const dy = e.touches[0]!.clientY - this.lastY;
        this.lastX = e.touches[0]!.clientX;
        this.lastY = e.touches[0]!.clientY;
        this.state.theta -= dx * 0.008;
        this.state.phi    = Math.max(0.08, Math.min(Math.PI/2.05, this.state.phi + dy * 0.008));
        this.update();
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0]!.clientX - e.touches[1]!.clientX,
          e.touches[0]!.clientY - e.touches[1]!.clientY
        );
        this.state.radius = Math.max(1, Math.min(20, this.state.radius * (lastTouchDist / dist)));
        lastTouchDist = dist;
        this.update();
      }
    }, { passive: false });
    this.domEl.addEventListener("touchend", () => { this.dragging = false; });
  }

  private onDown = (e: MouseEvent) => {
    if (!this._enabled) return;
    this.dragging   = true;
    this.rightDrag  = e.button === 2;
    this.lastX      = e.clientX;
    this.lastY      = e.clientY;
  };

  private onMove = (e: MouseEvent) => {
    if (!this.dragging || !this._enabled) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    if (this.rightDrag) {
      const pan = 0.004 * this.state.radius;
      const right = new THREE.Vector3();
      const dir   = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      right.crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
      this.state.target.addScaledVector(right, -dx * pan);
      this.state.target.y = Math.max(0, this.state.target.y + dy * pan * 0.5);
    } else {
      this.state.theta -= dx * 0.007;
      this.state.phi    = Math.max(0.08, Math.min(Math.PI/2.05, this.state.phi + dy * 0.007));
    }
    this.update();
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.state.radius = Math.max(1, Math.min(20, this.state.radius * (e.deltaY > 0 ? 1.1 : 0.91)));
    this.update();
  };

  dispose() {
    this.domEl.removeEventListener("mousedown", this.onDown);
    window.removeEventListener("mousemove", this.onMove);
  }
}