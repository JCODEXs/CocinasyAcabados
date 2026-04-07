"use client";

import { useState, useMemo } from "react";
import { type RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";
import { useQuoteBuilder } from "./context";
import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import type { ElementCategory } from "@prisma/client";

type Catalog = RouterOutputs["catalog"]["getFullCatalog"];
type ElementType = Catalog["elementTypes"][number];

const CATEGORY_LABELS: Record<string, string> = {
  MUEBLE_BAJO:     "Muebles bajos",
  MUEBLE_ALTO:     "Muebles altos",
  MESON:           "Mesones",
  ELECTRODOMESTICO:"Electrodomésticos",
  PANEL_YESO:      "Panel yeso",
  SUPERBOARD:      "Superboard",
  PUERTA:          "Puertas",
  ESTANTE:         "Estantes",
  OTRO:            "Otros",
};

const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS);

export function CatalogSidebar({ catalog }: { catalog: Catalog }) {
  const [search, setSearch] = useState("");
  const { projectId, invalidate } = useQuoteBuilder();

  const filtered = useMemo(() => {
    if (!search.trim()) return catalog.elementTypes;
    const q = search.toLowerCase();
    return catalog.elementTypes.filter(e => e.name.toLowerCase().includes(q));
  }, [search, catalog.elementTypes]);

  const byCategory = useMemo(() => {
    const map = new Map<string, ElementType[]>();
    for (const et of filtered) {
      const list = map.get(et.category) ?? [];
      list.push(et);
      map.set(et.category, list);
    }
    return map;
  }, [filtered]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar elemento..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-md border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-sm placeholder-gray-400 focus:border-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {CATEGORY_ORDER.map(cat => {
          const items = byCategory.get(cat as ElementCategory);
          if (!items?.length) return null;
          return (
            <div key={cat}>
              <p className="mb-1.5 px-1 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {CATEGORY_LABELS[cat]}
              </p>
              <div className="space-y-1">
                {items.map(et => (
                  <ElementTypeCard
                    key={et.id}
                    elementType={et}
                    projectId={projectId}
                    onAdded={invalidate}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">Sin resultados</p>
        )}
      </div>
    </div>
  );
}

// ─── Tarjeta individual del catálogo ─────────────────────────────────────────

function ElementTypeCard({
  elementType,
  projectId,
  onAdded,
}: {
  elementType: ElementType;
  projectId: string;
  onAdded: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const addItem = api.quotes.addQuoteItem.useMutation({
    onSuccess: () => { setAdding(false); onAdded(); },
  });

  const handleAdd = () => {
    setAdding(true);
    addItem.mutate({
      projectId,
      elementTypeId: elementType.id,
      label: elementType.name,
      width: elementType.defaultWidth ?? 60,
      height: elementType.defaultHeight ?? 72,
      depth: elementType.defaultDepth ?? 60,
      quantity: 1,
    });
  };

  return (
    <div className="group flex items-center justify-between rounded-md px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/60">
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm text-gray-800 dark:text-gray-200">{elementType.name}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          ${Number(elementType.basePrice).toLocaleString("es-CO")}{" "}
          / {elementType.unit === "POR_ML" ? "ml" : elementType.unit === "POR_M2" ? "m²" : "und"}
        </p>
      </div>
      <button
        onClick={handleAdd}
        disabled={adding}
        className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:border-gray-400 hover:text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:hover:border-gray-500 dark:hover:text-gray-300"
        title={`Agregar ${elementType.name}`}
      >
        {adding
          ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
          : <PlusIcon className="h-3.5 w-3.5" />
        }
      </button>
    </div>
  );
}