"use client";

import { useState, useRef } from "react";

interface Props {
  label: string;
  value: number;
  unit: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}

export function DimensionInput({ label, value, unit, disabled, min = 1, max = 999, step = 0.5, onChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [localVal, setLocalVal] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    const n = parseFloat(localVal);
    if (!isNaN(n) && n >= min && n <= max) {
      onChange(n);
    } else {
      setLocalVal(String(value)); // revertir si es inválido
    }
    setEditing(false);
  };

  if (disabled) {
    return (
      <div className="flex flex-col items-center">
        <span className="text-xs text-gray-400 dark:text-gray-500">{label}</span>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {value}{unit}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-gray-400 dark:text-gray-500">{label}</span>
      {editing ? (
        <input
          ref={inputRef}
          type="number"
          value={localVal}
          min={min}
          max={max}
          step={step}
          onChange={e => setLocalVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
          autoFocus
          className="w-16 rounded border border-blue-400 bg-white py-0.5 text-center text-xs font-medium focus:outline-none dark:border-blue-500 dark:bg-gray-800 dark:text-gray-100"
        />
      ) : (
        <button
          onClick={() => { setEditing(true); setLocalVal(String(value)); }}
          className="rounded px-1.5 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {value}{unit}
        </button>
      )}
    </div>
  );
}