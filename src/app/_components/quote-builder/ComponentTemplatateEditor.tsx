/* eslint-disable @typescript-eslint/no-implied-eval */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/app/dashboard/catalog/ComponentTemplatesEditor.tsx
"use client";

import { useState, useCallback, Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Edges, Grid, GizmoHelper, GizmoViewport } from "@react-three/drei";
import { api } from "@/trpc/react";
import type {MaterialCategory,SurfaceFinishType} from "@prisma/client"

// ─── Tipos ────────────────────────────────────────────────────────────────────

const COMPONENT_TYPES = [
  "LATERAL", "FONDO", "TECHO", "PISO", "ENTREPAÑO",
  "PUERTA", "FRENTE_CAJON", "CAJA_CAJON", "MESON", "ZOCALO", "DIVISION", "RIEL",
] as const;

type ComponentTypeStr = typeof COMPONENT_TYPES[number];

interface TemplateRow {
  id?:                     string;
  componentType:           ComponentTypeStr;
  label:                   string;
  // Fórmulas de DIMENSIÓN
  widthFormula:            string;
  heightFormula:           string;
  depthFormula:            string;
  // Fórmulas de POSICIÓN (centro del panel en cm)
  posXFormula:             string;
  posYFormula:             string;
  posZFormula:             string;
//   thicknessMM:             number;
// Rotations agregar a setTemplate y a row
//   rotXFormula:             string;
//   rotYFormula:             string;
//   rotZFormula:             string;
  quantity:                number;
  sortOrder:               number;
  topEdge:                 boolean;
  bottomEdge:              boolean;
  leftEdge:                boolean;
  rightEdge:               boolean;
  defaultMaterialCategory: MaterialCategory;
  defaultSurfaceFinishType:SurfaceFinishType;
}

// ─── Variables contextuales del evaluador ─────────────────────────────────────
// Estas variables se inyectan en todas las fórmulas además de W, H, D
// T  = espesor estándar (thicknessMM / 10 para pasar a cm)
// IW = ancho interno  = W - T*2
// IH = alto interno   = H - T*2
// ID = fondo interno  = D - T_FONDO (por defecto T = misma T)

function makeEvalContext(W: number, H: number, D: number, T = 1.8) {
  const IW = W - T * 2;
  const IH = H - T * 2;
  const ID = D - T;
  const ZO = 7;
  return { W, H, D, T, IW, IH, ID,ZO };
}

function evalFormula(formula: string, ctx: Record<string, number>): number {
  if (!formula.trim()) return 0;
  try {
    const expr = Object.entries(ctx).reduce(
      (acc, [k, v]) => acc.replace(new RegExp(`\\b${k}\\b`, "g"), String(v)),
      formula.trim()
    );
    if (!/^[\d\s+\-*/().]+$/.test(expr)) return 0;
    const result = (Function(`"use strict"; return (${expr})`) as () => number)();
    return isFinite(result) ? Math.max(-1000, result) : 0;
  } catch {
    return 0;
  }
}

// ─── Colores por tipo de componente ──────────────────────────────────────────

const COMPONENT_COLORS: Record<string, string> = {
  LATERAL:      "#e8dcc8",
  FONDO:        "#d4c8b0",
  TECHO:        "#f0e8d0",
  PISO:         "#d8d0b8",
  ENTREPAÑO:    "#e0d4bc",
  PUERTA:       "#c8a878",
  FRENTE_CAJON: "#d4b088",
  CAJA_CAJON:   "#b8a888",
  MESON:        "#909090",
  ZOCALO:       "#c8c0a8",
  DIVISION:     "#ddd4bc",
  RIEL:         "#b0b8c0",
};

const COMPONENT_LABELS: Record<string, string> = {
  LATERAL: "Lateral", FONDO: "Fondo", TECHO: "Techo", PISO: "Piso",
  ENTREPAÑO: "Entrepaño", PUERTA: "Puerta", FRENTE_CAJON: "Frente cajón",
  CAJA_CAJON: "Caja cajón", MESON: "Mesón", ZOCALO: "Zócalo",
  DIVISION: "División", RIEL: "Riel",
};

const MATERIAL_CATEGORIES = [
  "MADERA_NATURAL", "MDF_LACADO", "MELAMINA", "GRANITO",
  "MARMOL", "CUARZO", "CERAMICA", "PANEL_YESO", "SUPERBOARD", "OTRO",
];

const SURFACE_FINISH_TYPES = [
  "LACADO", "CHAPA_MADERA", "MELAMINA", "VINILO_ADHESIVO",
  "PINTURA", "BARNIZ", "SIN_ACABADO",
];

// ─── Generadores de casco ─────────────────────────────────────────────────────

interface SkeletonConfig {
  style:         "BASE_CABINET" | "WALL_CABINET" | "ISLAND" | "DRAWER_UNIT";
  assembly:      "LATERAL_PASANTE" | "PISO_PASANTE";
  zocalo:        number;
  hasCeiling:    boolean;
  hasBack:       boolean;
  hasBase:       boolean;
  thicknessMM:   number;
  backThicknessMM: number;
}
type SkeletonConfigValue = 
  | "BASE_CABINET" | "WALL_CABINET" | "ISLAND" | "DRAWER_UNIT"  // for style
  | "LATERAL_PASANTE" | "PISO_PASANTE"                          // for assembly
  | number                                                        // for zocalo, thicknessMM, backThicknessMM
  | boolean; 

  function isBooleanConfigValue(value: SkeletonConfigValue): value is boolean {
  return typeof value === 'boolean';
}

function generateSkeleton(cfg: SkeletonConfig): TemplateRow[] {
  const T     = cfg.thicknessMM / 10;    // cm
  const TF    = cfg.backThicknessMM / 10; // cm (espesor fondo)
  const Z     = cfg.zocalo;              // cm

  // Fórmulas que varían según el tipo de ensamble
  const isLP = cfg.assembly === "LATERAL_PASANTE";

  // En "lateral pasante": laterales van de suelo a techo, piso/techo encajan entre ellos
  // En "piso pasante":    piso y techo van de lado a lado, laterales encajan entre ellos

  const latH  = isLP ? `H - ${Z}`  : `H - ${Z} - T`;
  const latPY = isLP ? `(H - ${Z}) / 2 + ${Z}` : `(H - ${Z} - T) / 2 + ${Z} + T/2`;

  const sueloPanH = `T`;
  const techoW    = isLP ? `W - T * 2` : `W`;
  const pisoW     = isLP ? `W - T * 2` : `W`;
  const sueloPY   = `${Z} + T / 2`;

  const rows: TemplateRow[] = [];
  let sort = 0;

  const base = (overrides: Partial<TemplateRow>): TemplateRow => ({
    componentType:           "LATERAL",
    label:                   "",
    widthFormula:            "T",
    heightFormula:           "H",
    depthFormula:            "D",
    posXFormula:             "0",
    posYFormula:             "H / 2",
    posZFormula:             "0",
    // thicknessMM:             cfg.thicknessMM,
    quantity:                1,
    sortOrder:               sort++,
    topEdge:                 false,
    bottomEdge:              false,
    leftEdge:                true,
    rightEdge:               false,
    defaultMaterialCategory: "MELAMINA",
    defaultSurfaceFinishType:"MELAMINA",
    ...overrides,
  });

  // ── Laterales ────────────────────────────────────────────────────────────
  rows.push(base({
    componentType: "LATERAL", label: "Lateral Izq",
    widthFormula:  "T",
    heightFormula: latH,
    depthFormula:  "D",
    posXFormula:   "-W / 2 + T / 2",
    posYFormula:   latPY,
    posZFormula:   "0",
    leftEdge: true, rightEdge: false,
  }));

  rows.push(base({
    componentType: "LATERAL", label: "Lateral Der",
    widthFormula:  "T",
    heightFormula: latH,
    depthFormula:  "D",
    posXFormula:   "W / 2 - T / 2",
    posYFormula:   latPY,
    posZFormula:   "0",
    leftEdge: false, rightEdge: true,
    sortOrder:     sort++,
  }));

  // ── Piso ─────────────────────────────────────────────────────────────────
  if (cfg.hasBase) rows.push(base({
    componentType: "PISO", label: "Piso",
    widthFormula:  pisoW,
    heightFormula: sueloPanH,
    depthFormula:  `D - ${TF}`,
    posXFormula:   "0",
    posYFormula:   sueloPY,
    posZFormula:   `${TF} / 2`,
    topEdge: false, bottomEdge: false, leftEdge: false, rightEdge: false,
    sortOrder: sort++,
  }));

  // ── Techo ─────────────────────────────────────────────────────────────────
  if (cfg.hasCeiling) rows.push(base({
    componentType: "TECHO", label: "Techo",
    widthFormula:  techoW,
    heightFormula: "T",
    depthFormula:  `D - ${TF}`,
    posXFormula:   "0",
    posYFormula:   `H - T / 2`,
    posZFormula:   `${TF} / 2`,
    topEdge: true, bottomEdge: false,
    sortOrder: sort++,
  }));

  // ── Fondo ─────────────────────────────────────────────────────────────────
  if (cfg.hasBack) rows.push(base({
    componentType:   "FONDO", label: "Fondo",
    widthFormula:    `W - T * 2`,
    heightFormula:   `H - ${Z} - T`,
    depthFormula:    `${TF}`,
    posXFormula:     "0",
    posYFormula:     `(H - ${Z} - T) / 2 + ${Z} + T / 2`,
    posZFormula:     `-D / 2 + ${TF} / 2`,
    // thicknessMM:     cfg.backThicknessMM,
    sortOrder: sort++,
  }));

  // ── Zócalo ────────────────────────────────────────────────────────────────
  if (Z > 0) rows.push(base({
    componentType: "ZOCALO", label: "Zócalo",
    widthFormula:  `W - T * 2`,
    heightFormula: `${Z}`,
    depthFormula:  "T",
    posXFormula:   "0",
    posYFormula:   `${Z} / 2`,
    posZFormula:   `D / 2 - T / 2-5`,
    sortOrder: sort++,
  }));

  return rows;
}

// ─── Plantillas rápidas ───────────────────────────────────────────────────────

type QuickTemplate = {
  label:         string;
  icon:          string;
  description:   string;
  row:           () => Partial<TemplateRow>;
};

const QUICK_TEMPLATES: QuickTemplate[] = [
  {
    label: "Entrepaño", icon: "▬", description: "Repisa interna con retiro frontal",
    row: () => ({
      componentType: "ENTREPAÑO", label: "Entrepaño",
      widthFormula: "IW", heightFormula: "T", depthFormula: "ID - 2",
      posXFormula: "0", posYFormula: "H / 2", posZFormula: "1",
    }),
  },
  {
    label: "División vertical", icon: "▮", description: "Divisor interno de ancho T",
    row: () => ({
      componentType: "DIVISION", label: "División",
      widthFormula: "T", heightFormula: "IH", depthFormula: "ID",
      posXFormula: "0", posYFormula: "H / 2", posZFormula: "T / 2",
    }),
  },
  {
    label: "Puerta", icon: "▭", description: "Frente de puerta con descuento de dilatación",
    row: () => ({
      componentType: "PUERTA", label: "Puerta",
      widthFormula: "W - 0.4", heightFormula: "H - 0.4", depthFormula: "T",
      posXFormula: "0", posYFormula: "H / 2", posZFormula: "D / 2 + T / 2",
      topEdge: true, bottomEdge: true, leftEdge: true, rightEdge: true,
      defaultSurfaceFinishType: "LACADO",
    }),
  },
  {
    label: "Frente cajón", icon: "▱", description: "Frente decorativo de cajón",
    row: () => ({
      componentType: "FRENTE_CAJON", label: "Frente cajón",
      widthFormula: "W - 0.4", heightFormula: "H / 3 - 0.4", depthFormula: "T",
      posXFormula: "0", posYFormula: "H / 6", posZFormula: "D / 2 + T / 2",
      defaultSurfaceFinishType: "LACADO",
    }),
  },
  {
    label: "Mesón", icon: "━", description: "Cubierta superior (granito/cuarzo)",
    row: () => ({
      componentType: "MESON", label: "Mesón",
      widthFormula: "W + 2", heightFormula: "T", depthFormula: "D + 4",
      posXFormula: "1", posYFormula: "H + T / 2", posZFormula: "2",
      defaultMaterialCategory: "GRANITO",
    }),
  },
  {
    label: "Panel en blanco", icon: "+", description: "Panel totalmente personalizable",
    row: () => ({
      componentType: "LATERAL", label: "",
      widthFormula: "T", heightFormula: "H", depthFormula: "D",
      posXFormula: "0", posYFormula: "H / 2", posZFormula: "0",
    }),
  },
];

// ─── Preview 3D ───────────────────────────────────────────────────────────────

function PanelMesh({
  row, ctx, isHighlighted,
}: {
  row:           TemplateRow;
  ctx:           Record<string, number>;
  isHighlighted: boolean;
}) {
  const w = evalFormula(row.widthFormula,  ctx) / 100;   // cm → m
  const h = evalFormula(row.heightFormula, ctx) / 100;
  const d = evalFormula(row.depthFormula,  ctx) / 100;
  const x = evalFormula(row.posXFormula,   ctx) / 100;
  const y = evalFormula(row.posYFormula,   ctx) / 100;
  const z = evalFormula(row.posZFormula,   ctx) / 100;

  if (w <= 0 || h <= 0 || d <= 0 || isNaN(w) || isNaN(h) || isNaN(d)) return null;

  const color = COMPONENT_COLORS[row.componentType] ?? "#e0d8c0";

  return (
    <mesh position={[x, y, z]}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial
        color={isHighlighted ? "#f5c842" : color}
        // transparent
        opacity={isHighlighted ? 1 : 0.88}
      />
      <Edges
        threshold={5}
        color={isHighlighted ? "#c8a020" : "rgba(0,0,0,0.35)"}
      />
    </mesh>
  );
}

function Preview3D({
  rows, W, H, D,
  highlightIdx,
  thicknessMM
}: {
  rows:         TemplateRow[];
  W:            number;
  H:            number;
  D:            number;
  highlightIdx: number | null;
  thicknessMM:  number;
}) {
  const T   =  thicknessMM?thicknessMM / 10 : 1.8;
  const ctx = makeEvalContext(W, H, D, T);

  const Wm = W / 100;
  const Hm = H / 100;
  const Dm = D / 100;

  return (
    <div className="relative h-80 w-full overflow-hidden rounded-lg border border-gray-800 bg-gray-950">
      <Canvas
        camera={{
          position: [Wm * 2.2, Hm * 2, Dm * 2.5],
          fov:      45,
        }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 4, 3]} intensity={1.2} castShadow />
        <directionalLight position={[-2, 1, -2]} intensity={0.4} />

        {/* Dimensiones de referencia (caja fantasma) */}
        <mesh position={[0, Hm / 2, 0]}>
          <boxGeometry args={[Wm, Hm, Dm]} />
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={0.03}
            wireframe={false}
          />
          <Edges threshold={1} color="rgba(255,255,255,0.12)" />
        </mesh>

        {/* Paneles */}
        {rows.map((row, idx) => (
          <PanelMesh
            key={idx}
            row={row}
            ctx={ctx}
            isHighlighted={highlightIdx === idx}
          />
        ))}

        <Grid
          position={[0, -0.002, 0]}
          args={[10, 10]}
          cellSize={0.1}
          cellThickness={0.4}
          cellColor="#333"
          sectionSize={0.5}
          sectionThickness={0.8}
          sectionColor="#555"
          fadeDistance={8}
          infiniteGrid
        />

        <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
          <GizmoViewport
            axisColors={["#e05050", "#50e050", "#5080e0"]}
            labelColor="white"
          />
        </GizmoHelper>

        <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
      </Canvas>

      {/* Leyenda de colores */}
      <div className="absolute bottom-2 left-2 flex flex-wrap gap-1.5">
        {[...new Set(rows.map(r => r.componentType))].map(type => (
          <div key={type} className="flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5">
            <div
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: COMPONENT_COLORS[type] ?? "#ccc" }}
            />
            <span className="text-[10px] text-gray-300">{COMPONENT_LABELS[type]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Modal del generador de casco ────────────────────────────────────────────

function SkeletonGeneratorModal({
  onGenerate,
  onClose,
}: {
  onGenerate: (rows: TemplateRow[]) => void;
  onClose:    () => void;
}) {
  const [cfg, setCfg] = useState<SkeletonConfig>({
    style:           "BASE_CABINET",
    assembly:        "LATERAL_PASANTE",
    zocalo:          7,
    hasCeiling:      false,
    hasBack:         true,
    hasBase:         true,
    thicknessMM:     18,
    backThicknessMM: 9,
  });

  const preview = useMemo(() => generateSkeleton(cfg), [cfg]);

  const STYLES = [
    { id: "BASE_CABINET",  icon: "▭", label: "Mueble bajo",      desc: "Con zócalo, sin techo" },
    { id: "WALL_CABINET",  icon: "▫", label: "Mueble alto",      desc: "Sin zócalo, con techo" },
    { id: "ISLAND",        icon: "◻", label: "Isla / Península", desc: "Acceso por 4 lados" },
    { id: "DRAWER_UNIT",   icon: "≡", label: "Cajonera",         desc: "Para frentes de cajón" },
  ];

  const W = 80, H = 72, D = 60; // dimensiones de preview

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="flex h-[90vh] w-[900px] max-w-[95vw] flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <div>
            <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-amber-400">
              Generador de casco
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Configura el tipo de ensamble y genera los paneles base automáticamente
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: config */}
          <div className="flex w-80 shrink-0 flex-col gap-5 overflow-y-auto border-r border-gray-800 p-5">

            {/* Tipo de mueble */}
            <div>
              <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-gray-400">
                Tipo de mueble
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STYLES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setCfg(c => ({ ...c, style: s.id as SkeletonConfig["style"] }))}
                    className={`rounded border p-2.5 text-left transition-all ${
                      cfg.style === s.id
                        ? "border-amber-500 bg-amber-500/10 text-amber-300"
                        : "border-gray-700 text-gray-400 hover:border-gray-500"
                    }`}
                  >
                    <span className="block text-xl">{s.icon}</span>
                    <span className="block text-xs font-medium">{s.label}</span>
                    <span className="block text-[10px] text-gray-500">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tipo de ensamble */}
            <div>
              <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-gray-400">
                Ensamble
              </label>
              {[
                { id: "LATERAL_PASANTE", label: "Laterales pasantes", desc: "Laterales de suelo a techo" },
                { id: "PISO_PASANTE",    label: "Piso pasante",       desc: "Piso y techo de lado a lado" },
              ].map(a => (
                <label key={a.id} className="flex cursor-pointer items-start gap-2.5 rounded border border-transparent py-2 hover:border-gray-700">
                  <input
                    type="radio"
                    name="assembly"
                    checked={cfg.assembly === a.id}
                    onChange={() => setCfg(c => ({ ...c, assembly: a.id as SkeletonConfig["assembly"] }))}
                    className="mt-0.5 accent-amber-500"
                  />
                  <div>
                    <p className="text-xs font-medium text-gray-300">{a.label}</p>
                    <p className="text-[10px] text-gray-500">{a.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* Espesores */}
            <div className="grid grid-cols-2 gap-3">
              <CfgField
                label="Espesor (mm)" value={cfg.thicknessMM}
                onChange={v => setCfg(c => ({ ...c, thicknessMM: v }))}
              />
              <CfgField
                label="Fondo (mm)" value={cfg.backThicknessMM}
                onChange={v => setCfg(c => ({ ...c, backThicknessMM: v }))}
              />
              <CfgField
                label="Zócalo (cm)" value={cfg.zocalo}
                onChange={v => setCfg(c => ({ ...c, zocalo: v }))}
              />
            </div>

            {/* Checkboxes */}
            <div>
              <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-gray-400">
                Incluir
              </label>
              {[
                { key: "hasCeiling", label: "Techo / tapa superior" },
                { key: "hasBack",    label: "Fondo trasero" },
                { key: "hasBase",    label: "Piso base" },
              ].map(({ key, label }) => (
                <label key={key} className="flex cursor-pointer items-center gap-2.5 py-1.5">
                <input
                 type="checkbox"
                 checked={cfg[key as keyof SkeletonConfig] as boolean}
                 onChange={e => setCfg(c => ({ ...c, [key]: e.target.checked }))}
                 className="accent-amber-500"
                 />
                  <span className="text-xs text-gray-300">{label}</span>
                </label>
              ))}
            </div>

            {/* Variables disponibles */}
            <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
              <p className="mb-2 font-mono text-xs uppercase tracking-widest text-gray-500">Variables</p>
              <div className="space-y-1 font-mono text-[10px]">
                {[
                  ["W", "Ancho total"],
                  ["H", "Alto total"],
                  ["D", "Fondo total"],
                  ["T", `Espesor (${cfg.thicknessMM}mm)`],
                  ["IW", "W − T×2"],
                  ["IH", "H − T×2"],
                  ["ID", "D − T_Fondo"],
                ].map(([v, desc]) => (
                  <div key={v} className="flex gap-2">
                    <span className="w-6 text-amber-400">{v}</span>
                    <span className="text-gray-500">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: preview */}
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
            <Preview3D rows={preview} W={W} H={H} D={D} highlightIdx={null} thicknessMM={2} />

            <div>
              <p className="mb-2 font-mono text-xs uppercase tracking-widest text-gray-400">
                Paneles que se generarán ({preview.length})
              </p>
              <div className="space-y-1.5">
                {preview.map((row, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-md border border-gray-800 bg-gray-950 px-3 py-2">
                    <div className="h-3 w-3 rounded-sm" style={{ background: COMPONENT_COLORS[row.componentType] ?? "#ccc" }} />
                    <span className="flex-1 text-xs text-gray-300">{row.label || COMPONENT_LABELS[row.componentType]}</span>
                    <span className="font-mono text-[10px] text-gray-500">
                      {row.widthFormula} × {row.heightFormula} × {row.depthFormula}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-800 px-6 py-4">
          <p className="text-xs text-gray-500">
            Los paneles se agregarán al editor. Puedes editar cualquier fórmula después.
          </p>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="rounded-md border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:border-gray-500 hover:text-gray-200">
              Cancelar
            </button>
            <button
              onClick={() => { onGenerate(preview); onClose(); }}
              className="rounded-md bg-amber-500 px-5 py-2 text-sm font-semibold text-gray-900 hover:bg-amber-400"
            >
              Generar {preview.length} paneles →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CfgField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] text-gray-500">{label}</label>
      <input
        type="number"
        value={value}
        min={0}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1.5 font-mono text-xs text-gray-200 focus:border-amber-500 focus:outline-none"
      />
    </div>
  );
}

// ─── Editor principal ─────────────────────────────────────────────────────────

const emptyRow = (sort = 0): TemplateRow => ({
  componentType: "LATERAL", label: "",
  widthFormula: "T", heightFormula: "H", depthFormula: "D",
  posXFormula: "0", posYFormula: "H / 2", posZFormula: "0", quantity: 1, sortOrder: sort,
  topEdge: false, bottomEdge: false, leftEdge: false, rightEdge: false,
  defaultMaterialCategory: "MELAMINA", defaultSurfaceFinishType: "MELAMINA",
});

export function ComponentTemplatesEditor({
  elementTypeId,
  templates,
  onSaved,
  
}: {
  elementTypeId: string;
  templates:     any[];
  onSaved:       () => void;
}) {
  const [rows, setRows] = useState<TemplateRow[]>(() =>
    templates.length > 0
      ? templates.map((t: any, i: number) => ({
          id: t.id, componentType: t.componentType, label: t.label ?? "",
          widthFormula:  t.widthFormula,  heightFormula:  t.heightFormula,
          depthFormula:  t.depthFormula ?? "D",
          posXFormula:   t.posXFormula ?? "0",
          posYFormula:   t.posYFormula ?? "H / 2",
          posZFormula:   t.posZFormula ?? "0",
        //   thicknessMM:   t.thicknessMM, 
           quantity:        t.quantity,
          sortOrder:     i,
          topEdge: t.topEdge, bottomEdge: t.bottomEdge,
          leftEdge: t.leftEdge, rightEdge: t.rightEdge,
          defaultMaterialCategory:  t.defaultMaterialCategory  ?? "MELAMINA",
          defaultSurfaceFinishType: t.defaultSurfaceFinishType ?? "",
        }))
      : []
  );

  // Dimensiones de preview ajustables
  const [thicknessMM, setthicknessMM] = useState(2);
  const [previewW, setPreviewW] = useState(80);
  const [previewH, setPreviewH] = useState(72);
  const [previewD, setPreviewD] = useState(60);
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);

  const [dirty,          setDirty]         = useState(false);
  const [showSkeleton,   setShowSkeleton]   = useState(false);
  const [showQuickMenu,  setShowQuickMenu]  = useState(false);
  const [activeFormula,  setActiveFormula]  = useState<{row: number; field: string} | null>(null);

  const save = api.catalog.setComponentTemplates.useMutation({
    onSuccess: () => { setDirty(false); onSaved(); },
  });

  const update = (idx: number, patch: Partial<TemplateRow>) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
    setDirty(true);
  };

  const moveRow = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= rows.length) return;
    const copy = [...rows];
    [copy[idx], copy[next]] = [copy[next]!, copy[idx]!];
    setRows(copy.map((r, i) => ({ ...r, sortOrder: i })));
    setDirty(true);
  };

  const removeRow = (idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, sortOrder: i })));
    setDirty(true);
  };

  const addFromTemplate = (tmpl: QuickTemplate) => {
    setRows(prev => {
      const newRow = { ...emptyRow(prev.length), ...tmpl.row() };
      return [...prev, newRow];
    });
    setDirty(true);
    setShowQuickMenu(false);
  };

  const handleGenerate = (newRows: TemplateRow[]) => {
    setRows(prev => [...prev, ...newRows.map((r, i) => ({ ...r, sortOrder: prev.length + i }))]);
    setDirty(true);
  };

  const T = thicknessMM ? thicknessMM / 10 : 1.8;
  const ctx = makeEvalContext(previewW, previewH, previewD, T);

  // Evaluar y mostrar el valor actual de una fórmula
  const evalPreview = (formula: string): string => {
    const val = evalFormula(formula, ctx);
    return val > -100 ? `= ${val.toFixed(2)} cm` : "⚠";
  };

  return (
    <div className="font-mono">
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowSkeleton(true)}
          className="flex items-center gap-1.5 rounded-md border border-amber-600/50 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20"
        >
          ⬡ Generar casco base
        </button>

        <div className="relative">
          <button
            onClick={() => setShowQuickMenu(o => !o)}
            className="flex items-center gap-1.5 rounded-md border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:border-gray-500 hover:text-gray-200"
          >
            + Agregar panel ▾
          </button>
          {showQuickMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowQuickMenu(false)} />
              <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-gray-700 bg-gray-900 py-1 shadow-xl">
                {QUICK_TEMPLATES.map(tmpl => (
                  <button
                    key={tmpl.label}
                    onClick={() => addFromTemplate(tmpl)}
                    className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-gray-800"
                  >
                    <span className="mt-0.5 text-base">{tmpl.icon}</span>
                    <div>
                      <p className="text-xs font-medium text-gray-200">{tmpl.label}</p>
                      <p className="text-[10px] text-gray-500">{tmpl.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {dirty && (
          <button
            onClick={() => save.mutate({
              elementTypeId,
              templates: rows.map((r, i) => ({
                ...r, sortOrder: i,
                defaultMaterialCategory:  r.defaultMaterialCategory  || "MELAMINA",
                defaultSurfaceFinishType: r.defaultSurfaceFinishType || "MELAMINA",
                id: undefined,
              })),
            })}
            disabled={save.isPending}
            className="ml-auto rounded-md bg-gray-100 px-4 py-1.5 text-xs font-bold text-gray-900 hover:bg-white disabled:opacity-50"
          >
            {save.isPending ? "Guardando..." : "Guardar paneles"}
          </button>
        )}
      </div>

      {/* Contenido principal: tabla + preview */}
      <div className="flex gap-4">

        {/* Tabla de paneles */}
        <div className="min-w-0 flex-1 overflow-x-auto">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-700 py-12 text-center">
              <p className="text-sm text-gray-500">Sin paneles definidos</p>
              <p className="mt-1 text-xs text-gray-600">
                Usa Generar casco base para empezar o agrega paneles individuales
              </p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800">
                  {["#", "Tipo", "Etiqueta", "Ancho", "Alto", "Fondo", "X", "Y", "Z",
                     "Q", "Cantos", "Mat.", "Acab.", ""].map(h => (
                    <th key={h} className="whitespace-nowrap px-2 py-1.5 text-left font-normal text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-gray-800/50 transition-colors ${
                      highlightIdx === idx ? "bg-amber-500/5" : "hover:bg-gray-800/30"
                    }`}
                    onMouseEnter={() => setHighlightIdx(idx)}
                    onMouseLeave={() => setHighlightIdx(null)}
                  >
                    {/* Orden */}
                    <td className="px-1 py-1">
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moveRow(idx, -1)} disabled={idx === 0}
                          className="text-gray-600 hover:text-gray-300 disabled:opacity-20 leading-none">▲</button>
                        <button onClick={() => moveRow(idx, 1)} disabled={idx === rows.length - 1}
                          className="text-gray-600 hover:text-gray-300 disabled:opacity-20 leading-none">▼</button>
                      </div>
                    </td>

                    {/* Tipo */}
                    <td className="px-1 py-1">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: COMPONENT_COLORS[row.componentType] ?? "#ccc" }} />
                        <select
                          value={row.componentType}
                          onChange={e => update(idx, { componentType: e.target.value as ComponentTypeStr })}
                          className="rounded border border-gray-700 bg-gray-900 py-0.5 pl-1 pr-4 text-xs text-gray-200 focus:outline-none"
                        >
                          {COMPONENT_TYPES.map(t => <option key={t} value={t}>{COMPONENT_LABELS[t]}</option>)}
                        </select>
                      </div>
                    </td>

                    {/* Etiqueta */}
                    <td className="px-1 py-1">
                      <input
                        value={row.label}
                        onChange={e => update(idx, { label: e.target.value })}
                        placeholder="Ej: Lateral izq."
                        className="w-24 rounded border border-gray-700 bg-gray-900 px-1.5 py-0.5 text-xs text-gray-200 focus:outline-none focus:border-amber-500"
                      />
                    </td>

                    {/* Fórmulas de dimensión */}
                    {(["widthFormula", "heightFormula", "depthFormula",
                       ] as const).map(field => (
                      <td key={field} className="px-1 py-1">
                        <div className="group relative">
                          <input
                            value={row[field]}
                            onChange={e => update(idx, { [field]: e.target.value })}
                            onFocus={() => setActiveFormula({ row: idx, field })}
                            onBlur={() => setActiveFormula(null)}
                            className={`w-20 rounded border bg-gray-900 px-1.5 py-0.5 font-mono text-xs focus:outline-none ${
                              evalFormula(row[field], ctx) > 0
                                ? "border-gray-700 text-gray-200 focus:border-amber-500"
                                : "border-red-900/50 text-red-400"
                            }`}
                          />
                          {/* Tooltip con valor evaluado */}
                          <div className="pointer-events-none absolute bottom-full left-0 mb-1 hidden rounded bg-gray-800 px-2 py-1 text-[10px] text-amber-300 shadow group-focus-within:block whitespace-nowrap">
                            {evalPreview(row[field])}
                          </div>
                        </div>
                      </td>
                    ))}
                    {([
                       "posXFormula",  "posYFormula",  "posZFormula"] as const).map(field => (
                      <td key={field} className="px-1 py-1">
                        <div className="group relative">
                          <input
                            value={row[field]}
                            onChange={e => update(idx, { [field]: e.target.value })}
                            onFocus={() => setActiveFormula({ row: idx, field })}
                            onBlur={() => setActiveFormula(null)}
                            className={`w-20 rounded border bg-gray-900 px-1.5 py-0.5 font-mono text-xs focus:outline-none ${
                              evalFormula(row[field], ctx) > -1000
                                ? "border-gray-700 text-gray-200 focus:border-amber-500"
                                : "border-red-900/50 text-red-400"
                            }`}
                          />
                          {/* Tooltip con valor evaluado */}
                          <div className="pointer-events-none absolute bottom-full left-0 mb-1 hidden rounded bg-gray-800 px-2 py-1 text-[10px] text-amber-300 shadow group-focus-within:block whitespace-nowrap">
                            {evalPreview(row[field])}
                          </div>
                        </div>
                      </td>
                    ))}

                    {/* Espesor */}
                    {/* <td className="px-1 py-1">
                      <input
                        type="number" value={row.thicknessMM}
                        onChange={e => update(idx, { thicknessMM: +e.target.value })}
                        className="w-12 rounded border border-gray-700 bg-gray-900 px-1.5 py-0.5 text-xs text-gray-200 focus:outline-none"
                      />
                    </td> */}

                    {/* Cantidad */}
                    <td className="px-1 py-1">
                      <input
                        type="number" min={1} value={row.quantity}
                        onChange={e => update(idx, { quantity: +e.target.value })}
                        className="w-10 rounded border border-gray-700 bg-gray-900 px-1.5 py-0.5 text-xs text-gray-200 focus:outline-none"
                      />
                    </td>

                    {/* Cantos */}
                    <td className="px-1 py-1">
                      <div className="grid grid-cols-2 gap-0.5">
                        {(["topEdge", "bottomEdge", "leftEdge", "rightEdge"] as const).map(edge => (
                          <label key={edge} title={{ topEdge: "↑", bottomEdge: "↓", leftEdge: "←", rightEdge: "→" }[edge]}
                            className="flex cursor-pointer items-center gap-0.5">
                            <input type="checkbox" checked={row[edge]}
                              onChange={e => update(idx, { [edge]: e.target.checked })}
                              className="h-2.5 w-2.5 accent-amber-500"
                            />
                            <span className="text-gray-500">{{ topEdge: "↑", bottomEdge: "↓", leftEdge: "←", rightEdge: "→" }[edge]}</span>
                          </label>
                        ))}
                      </div>
                    </td>

                    {/* Material default */}
                    <td className="px-1 py-1">
                      <select
                        value={row.defaultMaterialCategory}
                        onChange={e => update(idx, { defaultMaterialCategory: e.target.value as MaterialCategory })}
                        className="rounded border border-gray-700 bg-gray-900 py-0.5 pl-1 pr-4 text-xs text-gray-400 focus:outline-none max-w-[80px]"
                      >
                        <option value="">—</option>
                        {MATERIAL_CATEGORIES.map(c => <option key={c} value={c}>{c.split("_")[0]}</option>)}
                      </select>
                    </td>

                    {/* Acabado default */}
                    <td className="px-1 py-1">
                      <select
                        value={row.defaultSurfaceFinishType}
                        onChange={e => update(idx, { defaultSurfaceFinishType: e.target.value as SurfaceFinishType })}
                        className="rounded border border-gray-700 bg-gray-900 py-0.5 pl-1 pr-4 text-xs text-gray-400 focus:outline-none max-w-[80px]"
                      >
                        <option value="">—</option>
                        {SURFACE_FINISH_TYPES.map(t => <option key={t} value={t}>{t.split("_")[0]}</option>)}
                      </select>
                    </td>

                    {/* Eliminar */}
                    <td className="px-1 py-1">
                      <button onClick={() => removeRow(idx)}
                        className="rounded p-1 text-gray-600 hover:bg-red-900/30 hover:text-red-400">
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Preview 3D fijo a la derecha */}
        <div className="w-72 shrink-0">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-gray-500">Preview</span>
            <div className="flex gap-1.5">
              {[["W", previewW, setPreviewW], ["H", previewH, setPreviewH], ["D", previewD, setPreviewD]].map(
                ([lbl, val, setter]) => (
                  <label key={String(lbl)} className="flex items-center gap-1">
                    <span className="text-[9px] text-amber-400">{lbl as string}</span>
                    <input
                      type="number" value={val as number}
                      onChange={e => (setter as (v: number) => void)(+e.target.value || 60)}
                      className="w-10 rounded border border-gray-800 bg-gray-900 px-1 py-0.5 text-[10px] text-gray-300 focus:outline-none"
                    />
                  </label>
                )
              )}
            </div>
          </div>

          <Suspense fallback={
            <div className="h-80 w-full animate-pulse rounded-lg bg-gray-800" />
          }>
            <Preview3D rows={rows} W={previewW} H={previewH} D={previewD} highlightIdx={highlightIdx} thicknessMM={thicknessMM} />
          </Suspense>

          {/* Variables en tiempo real */}
          <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg border border-gray-800 bg-gray-950 p-2">
            {Object.entries(ctx).map(([k, v]) => (
              <div key={k} className="flex gap-1">
                <span className="text-[9px] text-amber-400">{k}</span>
                <span className="text-[9px] text-gray-500">{v.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal generador */}
      {showSkeleton && (
        <SkeletonGeneratorModal
          onGenerate={handleGenerate}
          onClose={() => setShowSkeleton(false)}
        />
      )}
    </div>
  );
}