"use client";

import { useState } from "react";
import { type RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";
import { useQuoteBuilder } from "./context";
import { ComponentEditor } from "./ComponentEditor";
import { HardwareSelector } from "./HardwareSelector";
import { DimensionInput } from "./DimensionInput";
import {
  ChevronDownIcon, ChevronRightIcon, TrashIcon,
  WrenchScrewdriverIcon, CubeIcon, SparklesIcon,
} from "@heroicons/react/24/outline";

type QuoteItem = RouterOutputs["quotes"]["getProject"]["layoutGroups"][number]["items"][number];

const COMPONENT_LABELS: Record<string, string> = {
  LATERAL: "Lateral", FONDO: "Fondo", TECHO: "Techo", PISO: "Piso",
  ENTREPAÑO: "Entrepaño", PUERTA: "Puerta", FRENTE_CAJON: "Frente cajón",
  CAJA_CAJON: "Caja cajón", MESON: "Mesón", ZOCALO: "Zócalo",
  DIVISION: "División", RIEL: "Riel",
};

export function QuoteItemCard({ item }: { item: QuoteItem }) {
  const { invalidate } = useQuoteBuilder();
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"components" | "hardware" | "supplies">("components");
  const [editingDims, setEditingDims] = useState(false);

  const deleteItem = api.quotes.deleteQuoteItem.useMutation({ onSuccess: invalidate });

  const updateItem = api.quotes.updateQuoteItem.useMutation({
    onSuccess: () => { setEditingDims(false); invalidate(); },
  });

  return (
    <div className={`rounded-md border transition-colors ${
      expanded
        ? "border-gray-300 dark:border-gray-600"
        : "border-gray-100 hover:border-gray-200 dark:border-gray-800 dark:hover:border-gray-700"
    } bg-white dark:bg-gray-900`}>

      {/* ── Fila principal ─────────────────────────────────────────────── */}
      <div
        className="flex cursor-pointer items-center gap-2 px-3 py-2.5"
        onClick={() => setExpanded(e => !e)}
      >
        {expanded
          ? <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          : <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        }

        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
            {item.label ?? item.elementType.name}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {item.width} × {item.height} × {item.depth} cm
            {item.quantity > 1 && <> · ×{item.quantity}</>}
          </p>
        </div>

        <span className="shrink-0 text-sm font-medium text-gray-900 dark:text-gray-100">
          ${Number(item.totalPrice).toLocaleString("es-CO")}
        </span>

        <button
          onClick={e => {
            e.stopPropagation();
            if (confirm("¿Eliminar este elemento?")) deleteItem.mutate({ id: item.id });
          }}
          className="shrink-0 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Panel expandido ────────────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800">

          {/* Dimensiones editables */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50/60 dark:bg-gray-800/30">
            <DimensionInput
              label="Ancho"
              value={item.width}
              unit="cm"
              disabled={!item.elementType.allowCustomWidth}
              onChange={v => updateItem.mutate({ id: item.id, width: v })}
            />
            <DimensionInput
              label="Alto"
              value={item.height}
              unit="cm"
              disabled={!item.elementType.allowCustomHeight}
              onChange={v => updateItem.mutate({ id: item.id, height: v })}
            />
            <DimensionInput
              label="Fondo"
              value={item.depth}
              unit="cm"
              disabled={!item.elementType.allowCustomDepth}
              onChange={v => updateItem.mutate({ id: item.id, depth: v })}
            />
            <DimensionInput
              label="Cant."
              value={item.quantity}
              unit=""
              min={1}
              step={1}
              onChange={v => updateItem.mutate({ id: item.id, quantity: v })}
            />
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 dark:border-gray-800">
            {([
              ["components", <CubeIcon className="h-3.5 w-3.5" />, "Paneles"],
              ["hardware",   <WrenchScrewdriverIcon className="h-3.5 w-3.5" />, "Herrajes"],
              ["supplies",   <SparklesIcon className="h-3.5 w-3.5" />, "Insumos"],
            ] as const).map(([tab, icon, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-gray-900 font-medium text-gray-900 dark:border-gray-100 dark:text-gray-100"
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                }`}
              >
                {icon}{label}
              </button>
            ))}
          </div>

          {/* Contenido del tab */}
          <div className="p-3">
            {activeTab === "components" && (
              <div className="space-y-2">
                {item.components.map(component => (
                  <ComponentEditor key={component.id} component={component} />
                ))}
              </div>
            )}

            {activeTab === "hardware" && (
              <HardwareSelector quoteItemId={item.id} hardwareItems={item.hardwareItems} />
            )}

            {activeTab === "supplies" && (
              <div className="space-y-1.5">
                {item.supplies.map(s => (
                  <div key={s.id} className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">
                      {s.assemblySupply.name}
                    </span>
                    <span className="text-gray-500">
                      {s.quantity} {s.assemblySupply.unit} · ${Number(s.totalPrice).toLocaleString("es-CO")}
                    </span>
                  </div>
                ))}
                {item.supplies.length === 0 && (
                  <p className="text-xs text-gray-400">Sin insumos automáticos configurados</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}