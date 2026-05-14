/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { type RouterOutputs } from "@/trpc/react";
import { KitchenScene }        from "./KitchenScene";
import { SimpleOrbitControls } from "./controls/OrbitControls";
import { useQuoteBuilder }     from "../quote-builder/context";
import {
  ArrowsPointingOutIcon, ViewfinderCircleIcon,
  SunIcon, Squares2X2Icon,
} from "@heroicons/react/24/outline";
import * as THREE from "three";

type Project = RouterOutputs["quotes"]["getProject"];

interface Props {
  project: Project;
  className?: string;
}

type ViewPreset = "perspective" | "top" | "front";

export function KitchenViewer({ project, className = "" }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const sceneRef     = useRef<KitchenScene | null>(null);
  const controlsRef  = useRef<SimpleOrbitControls | null>(null);
  const rafRef       = useRef<number>(0);
  const wrapRef      = useRef<HTMLDivElement>(null);

  const { select, selection } = useQuoteBuilder();
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [view, setView]   = useState<ViewPreset>("perspective");
  const [showWalls, setShowWalls] = useState(true);
  const [showGrid, setShowGrid]   = useState(true);

  // ─── Init Three.js ──────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;

    const scene    = new KitchenScene(canvas);
    sceneRef.current = scene;

    const controls = new SimpleOrbitControls(scene.camera, canvas);
    controlsRef.current = controls;

    // Callback de selección
    scene.onSelect = (itemId, label) => {
      setSelectedLabel(label);
      select(itemId ? { type: "item", quoteItemId: itemId } : null);
    };

    // Construir escena inicial
    scene.buildFromProject(project);

    // Resize observer
    const ro = new ResizeObserver(() => {
      scene.resize(wrap.clientWidth, wrap.clientHeight);
    });
    ro.observe(wrap);
    scene.resize(wrap.clientWidth, wrap.clientHeight);

    // Render loop
    let t = 0;
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      t += 0.015;
      // Leve animación ambiental de luz (strip under-cabinet)
   const light = scene.scene.children.find(
  (c): c is THREE.PointLight => c instanceof THREE.PointLight
);

if (light) {
  light.intensity = 0.45 + Math.sin(t) * 0.07;
}
      scene.render();
    };
    loop();

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      controls.dispose();
      scene.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Reactivo a cambios del proyecto ────────────────────────────────────

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const allItems = project.layoutGroups.flatMap(g => g.items);
    for (const item of allItems) {
      scene.updateItem(item);
    }
  }, [project]);

  // ─── Click handler ───────────────────────────────────────────────────────

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const scene = sceneRef.current;
    const canvas = canvasRef.current;
    if (!scene || !canvas) return;
    scene.handleClick(e.clientX, e.clientY, canvas.getBoundingClientRect());
  }, []);

  // ─── Controles de vista ──────────────────────────────────────────────────

  const handleViewChange = useCallback((preset: ViewPreset) => {
    setView(preset);
    controlsRef.current?.setView(preset);
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div ref={wrapRef} className={`relative flex flex-col overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center gap-2 px-3 py-2
        bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-1 rounded-lg
          border border-white/10 bg-black/40 p-1 backdrop-blur-sm">
          <ViewBtn active={view === "perspective"} onClick={() => handleViewChange("perspective")}
            icon={<ViewfinderCircleIcon className="h-3.5 w-3.5" />} label="3D" />
          <ViewBtn active={view === "top"} onClick={() => handleViewChange("top")}
            icon={<Squares2X2Icon className="h-3.5 w-3.5" />} label="Planta" />
          <ViewBtn active={view === "front"} onClick={() => handleViewChange("front")}
            icon={<SunIcon className="h-3.5 w-3.5" />} label="Frente" />
        </div>

        <div className="flex-1" />

        {selectedLabel && (
          <div className="pointer-events-auto rounded-md bg-black/50 px-2.5 py-1
            text-xs text-amber-300 backdrop-blur-sm border border-amber-400/20">
            {selectedLabel}
          </div>
        )}
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="flex-1 w-full cursor-grab active:cursor-grabbing"
        onClick={handleCanvasClick}
        onContextMenu={e => e.preventDefault()}
      />

      {/* Leyenda de grupos */}
      <GroupLegend project={project} />

      {/* Hint */}
      <div className="absolute bottom-3 left-3 text-xs text-white/25 pointer-events-none">
        Arrastrar: orbitar · Scroll: zoom · Click der.: pan
      </div>
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function ViewBtn({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void;
  icon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
        active
          ? "bg-white/15 text-white"
          : "text-white/50 hover:text-white/80"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

const GROUP_COLORS = ["#6090c0", "#50a080", "#c08040", "#9060b0", "#60a0a0"];

function GroupLegend({ project }: { project: Project }) {
  if (project.layoutGroups.length === 0) return null;
  return (
    <div className="absolute bottom-3 right-3 rounded-lg border border-white/10
      bg-black/50 px-3 py-2 backdrop-blur-sm pointer-events-none">
      {project.layoutGroups.map((g, i) => (
        <div key={g.id} className="flex items-center gap-2 mb-1 last:mb-0">
          <div className="h-2 w-2 rounded-sm" style={{ background: GROUP_COLORS[i % GROUP_COLORS.length] }} />
          <span className="text-xs text-white/50">{g.name}</span>
        </div>
      ))}
    </div>
  );
}