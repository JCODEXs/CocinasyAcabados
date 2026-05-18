"use client";

import { useEffect, useState } from "react";
import { type RouterOutputs } from "@/trpc/react";
import { useOptimisticGroup } from "./ui/hooks/useOptimisticGroup";
import { ArrowsRightLeftIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

type Group = RouterOutputs["quotes"]["getProject"]["layoutGroups"][number];

const ROTATION_PRESETS = [0, 90, 180, 270] as const;
const SNAP_CM = 5;

function snap(v: number, enabled: boolean): number {
  return enabled ? Math.round(v / SNAP_CM) * SNAP_CM : v;
}

function normalizeAngle(deg: number): number {
  const n = ((deg % 360) + 360) % 360;
  return n;
}

export function GroupPositionPanel({ group }: { group: Group }) {
  const { setPosition, createLTurn, isPending } = useOptimisticGroup(group.id);
  const [snapOn, setSnapOn] = useState(true);

  // Local text state para permitir edición libre sin pelearse con el cache
  const [xStr, setXStr] = useState(group.startX.toString());
  const [yStr, setYStr] = useState(group.startY.toString());
  const [aStr, setAStr] = useState(group.baseAngle.toString());

  // Sync cuando el server confirma o el grupo cambia desde otro lado
  useEffect(() => { setXStr(group.startX.toString()); }, [group.startX]);
  useEffect(() => { setYStr(group.startY.toString()); }, [group.startY]);
  useEffect(() => { setAStr(group.baseAngle.toString()); }, [group.baseAngle]);

  const commitX = () => {
    const raw = parseFloat(xStr);
    if (!Number.isFinite(raw)) { setXStr(group.startX.toString()); return; }
    const v = snap(raw, snapOn);
    if (v === group.startX) { setXStr(v.toString()); return; }
    setPosition({ startX: v });
  };

  const commitY = () => {
    const raw = parseFloat(yStr);
    if (!Number.isFinite(raw)) { setYStr(group.startY.toString()); return; }
    const v = snap(raw, snapOn);
    if (v === group.startY) { setYStr(v.toString()); return; }
    setPosition({ startY: v });
  };

  const commitA = () => {
    const raw = parseFloat(aStr);
    if (!Number.isFinite(raw)) { setAStr(group.baseAngle.toString()); return; }
    const v = normalizeAngle(raw);
    if (v === group.baseAngle) { setAStr(v.toString()); return; }
    setPosition({ baseAngle: v });
  };

  const setAngle = (deg: number) => {
    if (deg === group.baseAngle) return;
    setPosition({ baseAngle: deg });
  };

  return (
    <div className="space-y-2.5 rounded-md bg-gray-50 p-2.5 dark:bg-gray-800/40">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Posición y orientación
        </span>
        <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
          <input
            type="checkbox"
            checked={snapOn}
            onChange={(e) => setSnapOn(e.target.checked)}
            className="h-3 w-3"
          />
          Snap {SNAP_CM}cm
        </label>
      </div>

      {/* Inputs X / Y / Ángulo */}
      <div className="grid grid-cols-3 gap-2">
        <CoordInput label="X (cm)" value={xStr} onChange={setXStr} onCommit={commitX} disabled={isPending} />
        <CoordInput label="Y (cm)" value={yStr} onChange={setYStr} onCommit={commitY} disabled={isPending} />
        <CoordInput label="Rot°"    value={aStr} onChange={setAStr} onCommit={commitA} disabled={isPending} />
      </div>

      {/* Presets de rotación */}
      <div className="flex items-center gap-1">
        <ArrowPathIcon className="h-3 w-3 text-gray-400" />
        {ROTATION_PRESETS.map((deg) => {
          const active = normalizeAngle(group.baseAngle) === deg;
          return (
            <button
              key={deg}
              onClick={() => setAngle(deg)}
              disabled={isPending}
              className={`flex-1 rounded px-1.5 py-1 text-xs transition-colors ${
                active
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {deg}°
            </button>
          );
        })}
      </div>

      {/* Crear giro L */}
      <div className="flex gap-1">
        <button
          onClick={() => createLTurn({ sourceGroupId: group.id, direction: "LEFT" })}
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-1 rounded border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <ArrowsRightLeftIcon className="h-3 w-3 -scale-x-100" />
          Giro ← izq
        </button>
        <button
          onClick={() => createLTurn({ sourceGroupId: group.id, direction: "RIGHT" })}
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-1 rounded border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Giro der →
          <ArrowsRightLeftIcon className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function CoordInput({ label, value, onChange, onCommit, disabled }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10px] text-gray-500 dark:text-gray-400">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        disabled={disabled}
        className="w-full rounded border border-gray-200 bg-white px-1.5 py-1 text-xs text-gray-800 focus:border-blue-400 focus:outline-none disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
      />
    </label>
  );
}
