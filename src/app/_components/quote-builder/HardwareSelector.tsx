"use client";

import { api } from "@/trpc/react";
import { type RouterOutputs } from "@/trpc/react";
import { useQuoteBuilder } from "./context";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { QualityTier } from "@prisma/client";
import { useState } from "react";

type HardwareItem = RouterOutputs["quotes"]["getProject"]["layoutGroups"][number]["items"][number]["hardwareItems"][number];

const TIER_LABELS: Record<string, { label: string; cls: string }> = {
  ECONOMICO: { label: "Eco",     cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  ESTANDAR:  { label: "Estd.",   cls: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  PREMIUM:   { label: "Premium", cls: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300" },
  LUJO:      { label: "Lujo",    cls: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
};

export function HardwareSelector({ quoteItemId, hardwareItems }: {
  quoteItemId: string;
  hardwareItems: HardwareItem[];
}) {
  const { invalidate } = useQuoteBuilder();
  const [adding, setAdding] = useState(false);
  const [selectedHardwareId, setSelectedHardwareId] = useState("");
  const [qty, setQty] = useState(1);

  const { data: catalog } = api.catalog.getFullCatalog.useQuery(undefined, { staleTime: 5 * 60 * 1000 });

  const upsert = api.quotes.upsertHardwareItem.useMutation({
    onSuccess: () => { setAdding(false); setSelectedHardwareId(""); setQty(1); invalidate(); },
  });
  const remove = api.quotes.removeHardwareItem.useMutation({ onSuccess: invalidate });

  // Agrupar catálogo por categoría
  const byCategory = (catalog?.hardware ?? []).reduce((acc, h) => {
    const list = acc[h.category] ?? [];
    list.push(h);
    acc[h.category] = list;
    return acc;
  }, {} as Record<string, typeof catalog.hardware>);

  return (
    <div className="space-y-2">
      {/* Herrajes aplicados */}
      {hardwareItems.map(hw => {
        const tier = TIER_LABELS[hw.hardware.qualityTier];
        return (
          <div key={hw.id} className="flex items-center gap-2 text-xs">
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${tier?.cls ?? ""}`}>
              {tier?.label}
            </span>
            <span className="flex-1 text-gray-700 dark:text-gray-300">{hw.hardware.name}</span>
            <span className="shrink-0 text-gray-400">×{hw.quantity}</span>
            <span className="shrink-0 text-gray-600 dark:text-gray-400">
              ${Number(hw.totalPrice).toLocaleString("es-CO")}
            </span>
            <button
              onClick={() => remove.mutate({ id: hw.id })}
              className="shrink-0 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}

      {/* Agregar herraje */}
      {adding ? (
        <div className="rounded-md border border-gray-200 p-2.5 space-y-2 dark:border-gray-700">
          <select
            value={selectedHardwareId}
            onChange={e => setSelectedHardwareId(e.target.value)}
            className="w-full rounded border border-gray-200 bg-white py-1.5 pl-2 pr-6 text-xs text-gray-700 focus:border-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <option value="">— Seleccionar herraje —</option>
            {Object.entries(byCategory).map(([cat, items]) => (
              <optgroup key={cat} label={cat.replace(/_/g, " ")}>
                {items.map(h => (
                  <option key={h.id} value={h.id}>
                    [{TIER_LABELS[h.qualityTier]?.label}] {h.name} — ${Number(h.pricePerUnit).toFixed(0)}/{h.unit}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Cantidad</label>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={e => setQty(parseInt(e.target.value, 10) || 1)}
              className="w-16 rounded border border-gray-200 bg-white py-1 text-center text-xs focus:outline-none dark:border-gray-700 dark:bg-gray-800"
            />
            <button
              onClick={() => {
                if (!selectedHardwareId) return;
                upsert.mutate({ quoteItemId, hardwareId: selectedHardwareId, quantity: qty });
              }}
              disabled={!selectedHardwareId || upsert.isPending}
              className="flex-1 rounded-md bg-gray-900 py-1 text-xs font-medium text-white disabled:opacity-40 dark:bg-gray-100 dark:text-gray-900"
            >
              Agregar
            </button>
            <button
              onClick={() => setAdding(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Agregar herraje
        </button>
      )}
    </div>
  );
}