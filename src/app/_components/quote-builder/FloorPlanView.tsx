"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { type RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";
import { useQuoteBuilder } from "./context";

type Project = RouterOutputs["quotes"]["getProject"];
type LayoutGroup = Project["layoutGroups"][number];
type QuoteItem  = LayoutGroup["items"][number];

// ─── Constantes ──────────────────────────────────────────────────────────────

const BASE_SCALE = 3;   // px por cm a zoom=1
const WALL_PX    = 10;  // grosor de pared en px
const MIN_ZOOM   = 0.25;
const MAX_ZOOM   = 5;

// Paleta de colores por índice de grupo (fill, stroke)
const GROUP_PALETTE: Array<[string, string]> = [
  ["#C8D8F0", "#4A7AB5"],
  ["#C8E8D8", "#3A8A5A"],
  ["#F0E0C8", "#B07030"],
  ["#E8D0E8", "#8840A0"],
  ["#D0E8E8", "#2A8080"],
  ["#F0D8D0", "#B04040"],
  ["#E0E8C8", "#607040"],
  ["#D8D8F0", "#4040A0"],
];

const ELEMENT_CATEGORY_LABELS: Record<string, string> = {
  MUEBLE_BAJO: "MB", MUEBLE_ALTO: "MA", MESON: "M",
  ELECTRODOMESTICO: "E", PANEL_YESO: "PY", SUPERBOARD: "SB",
  PUERTA: "P", ESTANTE: "EST", OTRO: "?",
};

// ─── Tipos de estado ──────────────────────────────────────────────────────────

interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
}

interface DragState {
  type: "pan" | "group";
  startMx: number;
  startMy: number;
  // Para "group"
  groupId?: string;
  origStartX?: number;
  origStartY?: number;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  project: Project;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function FloorPlanView({ project }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { select, selection, invalidate } = useQuoteBuilder();

  const [view, setView] = useState<ViewState>({ zoom: 1, panX: 40, panY: 40 });
  const [drag, setDrag] = useState<DragState | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showDims, setShowDims] = useState(false);
  const [showConn, setShowConn] = useState(true);

  const moveGroup = api.layout.updateGroup.useMutation({ onSuccess: invalidate });

  // ─── Helpers de coordenadas ───────────────────────────────────────────────

  const s = useCallback((cm: number) => cm * BASE_SCALE * view.zoom, [view.zoom]);
  const tx = useCallback((cm: number) => WALL_PX + s(cm) + view.panX, [s, view.panX]);
  const tz = useCallback((cm: number) => WALL_PX + s(cm) + view.panY, [s, view.panY]);

  // Inverso: px → cm (para drag de grupos)
  const pxToCm = useCallback((px: number) => px / (BASE_SCALE * view.zoom), [view.zoom]);

  // ─── Handlers de interacción ──────────────────────────────────────────────

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    const rect = svgRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    setView(v => ({
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v.zoom * factor)),
      panX: mx - (mx - v.panX) * factor,
      panY: my - (my - v.panY) * factor,
    }));
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const handleSvgMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    // Si el click es sobre un grupo handle → drag de grupo
    const groupHandle = (e.target as Element).closest("[data-group-id]") as SVGElement | null;
    if (groupHandle) {
      const groupId = groupHandle.dataset.groupId!;
      const group = project.layoutGroups.find(g => g.id === groupId);
      if (!group) return;
      setDrag({
        type: "group",
        startMx: e.clientX,
        startMy: e.clientY,
        groupId,
        origStartX: group.startX,
        origStartY: group.startY,
      });
      e.stopPropagation();
      return;
    }
    // Sino → pan
    setDrag({ type: "pan", startMx: e.clientX, startMy: e.clientY });
  }, [project.layoutGroups]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drag) return;
    const dx = e.clientX - drag.startMx;
    const dy = e.clientY - drag.startMy;

    if (drag.type === "pan") {
      setView(v => ({ ...v, panX: v.panX + dx, panY: v.panY + dy }));
      setDrag(d => d ? { ...d, startMx: e.clientX, startMy: e.clientY } : null);
    } else if (drag.type === "group" && drag.groupId) {
      // Update visual instantly; commit on mouseup
      setView(v => ({ ...v })); // force re-render via state
    }
  }, [drag]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!drag) return;
    if (drag.type === "group" && drag.groupId) {
      const dx = e.clientX - drag.startMx;
      const dy = e.clientY - drag.startMy;
      const newStartX = (drag.origStartX ?? 0) + pxToCm(dx);
      const newStartY = (drag.origStartY ?? 0) + pxToCm(dy);
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        moveGroup.mutate({ id: drag.groupId, startX: newStartX, startY: newStartY });
      }
    }
    setDrag(null);
  }, [drag, pxToCm, moveGroup]);

  // Selección de item
  const handleItemClick = useCallback((e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    const current = selection?.type === "item" && selection.quoteItemId === itemId;
    select(current ? null : { type: "item", quoteItemId: itemId });
  }, [selection, select]);

  // ─── Cálculos de layout ───────────────────────────────────────────────────

  const roomW = project.roomWidth ?? 400;
  const roomL = project.roomLength ?? 300;

  const svgRoomW = s(roomW) + WALL_PX * 2;
  const svgRoomH = s(roomL) + WALL_PX * 2;

  // Item seleccionado
  const selectedItemId = selection?.type === "item" ? selection.quoteItemId : null;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="relative flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-gray-100 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
        <span className="text-xs text-gray-400">Plano 2D</span>
        <div className="mx-2 h-4 w-px bg-gray-100 dark:bg-gray-800" />

        <FpButton onClick={() => setView(v => ({ ...v, zoom: Math.min(MAX_ZOOM, v.zoom * 1.25) }))}>+ Zoom</FpButton>
        <FpButton onClick={() => setView(v => ({ ...v, zoom: Math.max(MIN_ZOOM, v.zoom * 0.8) }))}>− Zoom</FpButton>
        <FpButton onClick={() => setView({ zoom: 1, panX: 40, panY: 40 })}>Reset</FpButton>

        <div className="mx-2 h-4 w-px bg-gray-100 dark:bg-gray-800" />

        <FpButton active={showGrid}  onClick={() => setShowGrid(g => !g)}>Cuadrícula</FpButton>
        <FpButton active={showDims}  onClick={() => setShowDims(d => !d)}>Cotas</FpButton>
        <FpButton active={showConn}  onClick={() => setShowConn(c => !c)}>Conexiones</FpButton>

        <div className="ml-auto flex items-center gap-3">
          {selectedItemId && <SelectedItemBadge project={project} itemId={selectedItemId} onClear={() => select(null)} />}
          <span className="text-xs text-gray-400">{Math.round(view.zoom * 100)}%</span>
          <span className="text-xs text-gray-300 dark:text-gray-600">
            {roomW} × {roomL} cm
          </span>
        </div>
      </div>

      {/* SVG canvas */}
      <div className="relative flex-1 overflow-hidden bg-gray-50 dark:bg-gray-950">
        <svg
          ref={svgRef}
          className="h-full w-full select-none"
          style={{ cursor: drag?.type === "pan" ? "grabbing" : "default" }}
          onMouseDown={handleSvgMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={() => { if (!drag) select(null); }}
        >
          <defs>
            {/* Grilla de 100cm */}
            <pattern
              id="fp-grid-100"
              width={s(100)}
              height={s(100)}
              patternUnits="userSpaceOnUse"
              x={view.panX + WALL_PX}
              y={view.panY + WALL_PX}
            >
              <path
                d={`M ${s(100)} 0 L 0 0 0 ${s(100)}`}
                fill="none"
                stroke="rgba(0,0,0,0.08)"
                strokeWidth={0.5}
              />
            </pattern>
            {/* Grilla de 50cm */}
            <pattern
              id="fp-grid-50"
              width={s(50)}
              height={s(50)}
              patternUnits="userSpaceOnUse"
              x={view.panX + WALL_PX}
              y={view.panY + WALL_PX}
            >
              <path
                d={`M ${s(50)} 0 L 0 0 0 ${s(50)}`}
                fill="none"
                stroke="rgba(0,0,0,0.04)"
                strokeWidth={0.5}
              />
            </pattern>
            <marker id="fp-arrow" viewBox="0 0 8 8" refX="4" refY="4"
              markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M1 1 L7 4 L1 7" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth={1} />
            </marker>
          </defs>

          {/* ── Cuadrícula ─────────────────────────────────────────────── */}
          {showGrid && (
            <g>
              <rect
                x={tx(0) - WALL_PX} y={tz(0) - WALL_PX}
                width={svgRoomW} height={svgRoomH}
                fill="url(#fp-grid-50)"
              />
              <rect
                x={tx(0) - WALL_PX} y={tz(0) - WALL_PX}
                width={svgRoomW} height={svgRoomH}
                fill="url(#fp-grid-100)"
              />
            </g>
          )}

          {/* ── Paredes de la habitación ────────────────────────────────── */}
          <RoomWalls tx={tx} tz={tz} s={s} roomW={roomW} roomL={roomL} showDims={showDims} />

          {/* ── Grupos y elementos ──────────────────────────────────────── */}
          {project.layoutGroups.map((group, gIdx) => (
            <GroupLayer
              key={group.id}
              group={group}
              gIdx={gIdx}
              tx={tx}
              tz={tz}
              s={s}
              pxToCm={pxToCm}
              drag={drag}
              selectedItemId={selectedItemId}
              showDims={showDims}
              showConn={showConn}
              onItemClick={handleItemClick}
            />
          ))}

          {/* ── Compass ────────────────────────────────────────────────── */}
          <CompassRose x={20} y={20} size={28} />
        </svg>

        {/* ── Leyenda ────────────────────────────────────────────────────── */}
        <div className="absolute bottom-3 right-3 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <p className="mb-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">Grupos</p>
          {project.layoutGroups.map((group, gIdx) => {
            const [fill, stroke] = GROUP_PALETTE[gIdx % GROUP_PALETTE.length]!;
            return (
              <div key={group.id} className="flex items-center gap-2 mb-1">
                <div className="h-3 w-3 rounded-sm border" style={{ background: fill, borderColor: stroke }} />
                <span className="text-xs text-gray-500 dark:text-gray-400">{group.name}</span>
              </div>
            );
          })}
        </div>

        {/* Escala visual */}
        <ScaleBar s={s} zoom={view.zoom} />
      </div>
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function RoomWalls({ tx, tz, s, roomW, roomL, showDims }: {
  tx: (v: number) => number;
  tz: (v: number) => number;
  s: (v: number) => number;
  roomW: number;
  roomL: number;
  showDims: boolean;
}) {
  const x0 = tx(0) - WALL_PX;
  const y0 = tz(0) - WALL_PX;
  const sw = s(roomW) + WALL_PX * 2;
  const sh = s(roomL) + WALL_PX * 2;

  return (
    <g>
      {/* Relleno de fondo */}
      <rect x={x0} y={y0} width={sw} height={sh} fill="#f0ede8" rx={3}
        stroke="rgba(0,0,0,.15)" strokeWidth={0.5} />
      {/* Interior blanco */}
      <rect x={tx(0)} y={tz(0)} width={s(roomW)} height={s(roomL)}
        fill="white" />
      {/* Paredes (polilíneas del perímetro con grosor) */}
      <rect x={x0} y={y0} width={sw} height={sh} fill="none"
        stroke="rgba(0,0,0,.6)" strokeWidth={1.5} rx={3} />

      {/* Cotas de la habitación */}
      {showDims && (
        <g>
          <DimLine x1={tx(0)} y1={y0 - 14} x2={tx(roomW)} y2={y0 - 14}
            label={`${roomW} cm`} />
          <DimLine x1={x0 - 16} y1={tz(0)} x2={x0 - 16} y2={tz(roomL)}
            label={`${roomL} cm`} vertical />
        </g>
      )}
    </g>
  );
}

function GroupLayer({ group, gIdx, tx, tz, s, pxToCm, drag, selectedItemId,
  showDims, showConn, onItemClick }: {
  group: LayoutGroup;
  gIdx: number;
  tx: (v: number) => number;
  tz: (v: number) => number;
  s: (v: number) => number;
  pxToCm: (v: number) => number;
  drag: DragState | null;
  selectedItemId: string | null;
  showDims: boolean;
  showConn: boolean;
  onItemClick: (e: React.MouseEvent, id: string) => void;
}) {
  const [fill, stroke] = GROUP_PALETTE[gIdx % GROUP_PALETTE.length]!;

  // Si este grupo está siendo arrastrado, aplicar desplazamiento visual
  const isDraggingThis = drag?.type === "group" && drag.groupId === group.id;

  const items = group.items;

  return (
    <g>
      {/* Etiqueta del grupo — también es el handle de drag */}
      {items.length > 0 && (() => {
        const first = items[0]!;
        // Offset si está siendo arrastrado (solo visual; se commitea en mouseup)
        const lx = tx(first.posX);
        const lz = tz(first.posZ) - 14;
        return (
          <g
            data-group-id={group.id}
            style={{ cursor: "move" }}
          >
            <rect x={lx} y={lz - 10} width={group.name.length * 6 + 12} height={14}
              fill={fill} stroke={stroke} strokeWidth={0.5} rx={3} />
            <text
              x={lx + 6} y={lz - 3}
              fontSize={9} fontFamily="system-ui" fill={stroke}
              dominantBaseline="central" style={{ pointerEvents: "none" }}
            >
              {group.name}
            </text>
          </g>
        );
      })()}

      {/* Items del grupo */}
      {items.map((item, iIdx) => {
        const x  = tx(item.posX);
        const z  = tz(item.posZ);
        const iw = s(item.width);
        const id = s(item.depth);
        const cx = x + iw / 2;
        const cz = z + id / 2;
        const isSel = item.id === selectedItemId;
        const cat = item.elementType.category;

        return (
          <g
            key={item.id}
            transform={`rotate(${item.rotationY}, ${cx}, ${cz})`}
            onClick={(e) => onItemClick(e, item.id)}
            style={{ cursor: "pointer" }}
          >
            {/* Sombra sutil */}
            <rect x={x + 2} y={z + 2} width={iw} height={id}
              fill="rgba(0,0,0,.06)" rx={2} style={{ pointerEvents: "none" }} />

            {/* Relleno */}
            <rect
              x={x} y={z} width={iw} height={id}
              fill={fill}
              stroke={isSel ? stroke : `${stroke}80`}
              strokeWidth={isSel ? 2 : 0.8}
              strokeDasharray={isSel ? undefined : "4 2"}
              rx={2}
            />

            {/* Línea de profundidad (indica dónde está el frente del mueble) */}
            <line
              x1={x} y1={z + id * 0.15}
              x2={x + iw} y2={z + id * 0.15}
              stroke={stroke} strokeWidth={0.8} opacity={0.5}
              style={{ pointerEvents: "none" }}
            />

            {/* Etiqueta */}
            {iw > 24 && id > 16 && (
              <text
                x={cx} y={cz - (id > 30 ? 5 : 0)}
                fontSize={9} fontFamily="system-ui"
                textAnchor="middle" dominantBaseline="central"
                fill="rgba(0,0,0,.7)" style={{ pointerEvents: "none" }}
              >
                {item.label ?? item.elementType.name}
              </text>
            )}

            {/* Dimensiones */}
            {showDims && iw > 30 && id > 20 && (
              <text
                x={cx} y={cz + 8}
                fontSize={7.5} fontFamily="system-ui"
                textAnchor="middle" dominantBaseline="central"
                fill="rgba(0,0,0,.4)" style={{ pointerEvents: "none" }}
              >
                {item.width}×{item.depth}
              </text>
            )}

            {/* Categoría mini-label cuando el item es pequeño */}
            {iw <= 24 && (
              <text
                x={cx} y={cz}
                fontSize={7} fontFamily="system-ui"
                textAnchor="middle" dominantBaseline="central"
                fill="rgba(0,0,0,.6)" style={{ pointerEvents: "none" }}
              >
                {ELEMENT_CATEGORY_LABELS[cat] ?? "?"}
              </text>
            )}

            {/* Highlight de selección */}
            {isSel && (
              <rect
                x={x - 2} y={z - 2} width={iw + 4} height={id + 4}
                fill="none" stroke={stroke} strokeWidth={2}
                rx={4} style={{ pointerEvents: "none" }}
              />
            )}
          </g>
        );
      })}

      {/* Flechas de conexión entre items */}
      {showConn && items.map((item, iIdx) => {
        if (iIdx === items.length - 1) return null;
        if (item.connectionToNext === "END") return null;

        const next = items[iIdx + 1]!;
        const x1 = tx(item.posX + item.width / 2);
        const z1 = tz(item.posZ + item.depth / 2);
        const x2 = tx(next.posX + next.width / 2);
        const z2 = tz(next.posZ + next.depth / 2);

        return (
          <line key={`conn-${item.id}`}
            x1={x1} y1={z1} x2={x2} y2={z2}
            stroke={stroke} strokeWidth={1} strokeOpacity={0.4}
            strokeDasharray="4 3"
            markerEnd="url(#fp-arrow)"
          />
        );
      })}
    </g>
  );
}

// ─── Cota con flechas ─────────────────────────────────────────────────────────

function DimLine({ x1, y1, x2, y2, label, vertical }: {
  x1: number; y1: number; x2: number; y2: number;
  label: string; vertical?: boolean;
}) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="rgba(0,0,0,.25)" strokeWidth={0.5}
        markerStart="url(#fp-arrow)" markerEnd="url(#fp-arrow)" />
      <text
        x={mx} y={my}
        fontSize={8} fontFamily="system-ui"
        textAnchor="middle" dominantBaseline="central"
        fill="rgba(0,0,0,.5)"
        transform={vertical ? `rotate(-90, ${mx}, ${my})` : undefined}
      >
        {label}
      </text>
    </g>
  );
}

// ─── Rosa de los vientos ──────────────────────────────────────────────────────

function CompassRose({ x, y, size }: { x: number; y: number; size: number }) {
  const r = size / 2;
  return (
    <g transform={`translate(${x + r}, ${y + r})`} opacity={0.4}>
      <circle cx={0} cy={0} r={r} fill="white" stroke="rgba(0,0,0,.2)" strokeWidth={0.5} />
      {/* N */}
      <line x1={0} y1={-r * 0.9} x2={0} y2={0} stroke="rgba(0,0,0,.7)" strokeWidth={1.2} />
      <polygon points={`0,${-r*0.9} ${-r*0.22},${-r*0.4} ${r*0.22},${-r*0.4}`}
        fill="rgba(0,0,0,.7)" />
      <text x={0} y={-r * 1.35} fontSize={8} textAnchor="middle"
        dominantBaseline="central" fontFamily="system-ui" fill="rgba(0,0,0,.6)" fontWeight="500">N</text>
      {/* S E W ticks */}
      {[90, 180, 270].map(deg => {
        const rad = (deg * Math.PI) / 180;
        return (
          <line key={deg}
            x1={Math.cos(rad - Math.PI/2) * r * 0.5}
            y1={Math.sin(rad - Math.PI/2) * r * 0.5}
            x2={Math.cos(rad - Math.PI/2) * r * 0.85}
            y2={Math.sin(rad - Math.PI/2) * r * 0.85}
            stroke="rgba(0,0,0,.4)" strokeWidth={0.8} />
        );
      })}
    </g>
  );
}

// ─── Escala visual ────────────────────────────────────────────────────────────

function ScaleBar({ s, zoom }: { s: (v: number) => number; zoom: number }) {
  // Elegir una escala bonita: 50cm, 100cm, 200cm según zoom
  const targetPx = 80;
  const cmOptions = [25, 50, 100, 200, 500];
  const cm = cmOptions.find(c => s(c) >= targetPx) ?? 500;
  const barPx = s(cm);

  return (
    <div className="absolute bottom-3 left-3 flex flex-col items-start gap-1">
      <div className="flex items-center">
        <div
          className="h-px bg-gray-500 dark:bg-gray-400"
          style={{ width: barPx }}
        />
      </div>
      <div
        className="h-1.5 border-l border-r border-b border-gray-400 dark:border-gray-500"
        style={{ width: barPx }}
      />
      <span className="text-xs text-gray-400">{cm} cm</span>
    </div>
  );
}

// ─── Badge del item seleccionado ──────────────────────────────────────────────

function SelectedItemBadge({ project, itemId, onClear }: {
  project: Project;
  itemId: string;
  onClear: () => void;
}) {
  const item = project.layoutGroups
    .flatMap(g => g.items)
    .find(i => i.id === itemId);

  if (!item) return null;

  return (
    <div className="flex items-center gap-2 rounded-md bg-gray-100 px-2.5 py-1 text-xs dark:bg-gray-800">
      <span className="font-medium text-gray-700 dark:text-gray-300">
        {item.label ?? item.elementType.name}
      </span>
      <span className="text-gray-400">
        {item.width}×{item.height}×{item.depth} cm
      </span>
      <button onClick={onClear} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
        ×
      </button>
    </div>
  );
}

// ─── Botón de toolbar ─────────────────────────────────────────────────────────

function FpButton({ children, onClick, active }: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
        active
          ? "border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900"
          : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
      }`}
    >
      {children}
    </button>
  );
}