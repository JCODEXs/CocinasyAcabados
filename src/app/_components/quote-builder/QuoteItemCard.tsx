"use client";

import { useState } from "react";
import { useQuoteBuilder } from "./context";
import { useOptimisticItem } from "./ui/hooks/useOptimisticItem";
import { ComponentEditor } from "./ComponentEditor";
import { HardwareSelector } from "./HardwareSelector";
import { DimensionInput } from "./DimensionInput";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";
import {
  ChevronDownIcon, ChevronRightIcon, TrashIcon,
  WrenchScrewdriverIcon, CubeIcon, SparklesIcon,
} from "@heroicons/react/24/outline";

type QuoteItem = RouterOutputs["quotes"]["getProject"]["layoutGroups"][number]["items"][number];

export function QuoteItemCard({ item }: { item: QuoteItem }) {
  const { projectId, invalidateProject } = useQuoteBuilder();
  const utils = api.useUtils();
  const { updateDimension, isPending } = useOptimisticItem(item.id);

  // Pure UI state — fine to be local
  const [expanded,   setExpanded]   = useState(false);
  const [activeTab,  setActiveTab]  = useState<"components" | "hardware" | "supplies">("components");

  const deleteItem = api.quotes.deleteQuoteItem.useMutation({
    onMutate: async () => {
      await utils.quotes.getProject.cancel({ id: projectId });
      const snapshot = utils.quotes.getProject.getData({ id: projectId });

      // Eliminar el item del cache inmediatamente y recalcular totales localmente
      utils.quotes.getProject.setData({ id: projectId }, (old) => {
        if (!old) return old;
        const newGroups = old.layoutGroups.map(g => ({
          ...g,
          items: g.items.filter(i => i.id !== item.id),
        }));
        const newSubtotal =
          newGroups.flatMap(g => g.items).reduce((acc, i) => acc + Number(i.totalPrice), 0) +
          old.projectFinishes.reduce((acc, f) => acc + Number(f.totalPrice), 0);

        return {
          ...old,
          layoutGroups: newGroups,
          subtotal: newSubtotal as unknown as typeof old.subtotal,
          total:    newSubtotal as unknown as typeof old.total,
        };
      });

      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshot) {
        utils.quotes.getProject.setData({ id: projectId }, context.snapshot);
      }
    },

    onSuccess: (result) => {
      // Actualizar totales reales del servidor (incluye decimales exactos de BD)
      utils.quotes.getProject.setData({ id: projectId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          subtotal: result.project.subtotal as unknown as typeof old.subtotal,
          tax:      result.project.tax      as unknown as typeof old.tax,
          total:    result.project.total    as unknown as typeof old.total,
        };
      });
      // Safety net — sincronizar posiciones del grupo en background
      void invalidateProject();
    },
  });

  return (
    <div className={`rounded-md border transition-colors ${
      expanded
        ? "border-gray-300 dark:border-gray-600"
        : "border-gray-100 hover:border-gray-200 dark:border-gray-800 dark:hover:border-gray-700"
    } bg-white dark:bg-gray-900`}>

      {/* Row */}
      <div
        className="flex cursor-pointer items-center gap-2 px-3 py-2.5"
        onClick={() => setExpanded(e => !e)}
      >
        {expanded
          ? <ChevronDownIcon  className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          : <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        }

        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
            {item.label ?? item.elementType.name}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {/* item comes directly from cache — always fresh */}
            {item.width} × {item.height} × {item.depth} cm
            {item.quantity > 1 && <> · ×{item.quantity}</>}
          </p>
        </div>

        <span className="shrink-0 min-w-[80px] text-right text-sm font-medium text-gray-900 dark:text-gray-100">
          {isPending
            ? <span className="inline-block h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            : `$${Number(item.totalPrice).toLocaleString("es-CO")}`
          }
        </span>

        <button
          onClick={e => {
            e.stopPropagation();
            if (confirm("¿Eliminar este elemento?")) {
              deleteItem.mutate({ id: item.id });
            }
          }}
          className="shrink-0 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 bg-gray-50/60 px-3 py-2 dark:bg-gray-800/30">
            <DimensionInput
              label="Ancho"
              value={item.width}
              unit="cm"
              disabled={!item.elementType.allowCustomWidth}
              onChange={v => updateDimension("width", v)}
            />
            <DimensionInput
              label="Alto"
              value={item.height}
              unit="cm"
              disabled={!item.elementType.allowCustomHeight}
              onChange={v => updateDimension("height", v)}
            />
            <DimensionInput
              label="Fondo"
              value={item.depth}
              unit="cm"
              disabled={!item.elementType.allowCustomDepth}
              onChange={v => updateDimension("depth", v)}
            />
            <DimensionInput
              label="Cant."
              value={item.quantity}
              unit=""
              min={1}
              step={1}
              onChange={v => updateDimension("quantity", v)}
            />
            {isPending && (
              <span className="ml-auto text-xs text-gray-400">Calculando...</span>
            )}
          </div>

          <div className="flex border-b border-gray-100 dark:border-gray-800">
            {([
              ["components", <CubeIcon key={"compon"}className="h-3.5 w-3.5" />,              "Paneles"],
              ["hardware",   <WrenchScrewdriverIcon key={"hardware"} className="h-3.5 w-3.5" />, "Herrajes"],
              ["supplies",   <SparklesIcon key={"supplies"} className="h-3.5 w-3.5" />,          "Insumos"],
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

          <div className="p-3">
            {activeTab === "components" && (
              <div className="space-y-2">
                {item.components.length === 0
                  ? <p className="text-xs text-gray-400">Sin paneles. ¿El tipo de elemento tiene templates?</p>
                  : item.components.map(comp => (
                      <ComponentEditor key={comp.id} component={comp} />
                    ))
                }
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
                  <p className="text-xs text-gray-400">Sin insumos automáticos</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}