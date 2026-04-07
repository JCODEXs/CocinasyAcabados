"use client";

import { api } from "@/trpc/react";
import { type RouterOutputs } from "@/trpc/react";
import { useQuoteBuilder } from "./context";
import { MaterialSwatch } from "./ui/MaterialSwatch";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

type Component = RouterOutputs["quotes"]["getProject"]["layoutGroups"][number]["items"][number]["components"][number];

const COMPONENT_LABELS: Record<string, string> = {
  LATERAL: "Lateral", FONDO: "Fondo", TECHO: "Techo", PISO: "Piso",
  ENTREPAÑO: "Entrepaño", PUERTA: "Puerta", FRENTE_CAJON: "Frente cajón",
  CAJA_CAJON: "Caja cajón", MESON: "Mesón", ZOCALO: "Zócalo",
  DIVISION: "División", RIEL: "Riel",
};

export function ComponentEditor({ component }: { component: Component }) {
  const { invalidate } = useQuoteBuilder();

  const { data: catalog } = api.catalog.getFullCatalog.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const updateComponent = api.quotes.updateComponent.useMutation({ onSuccess: invalidate });

  const areaM2 = component.boardAreaM2;

  return (
    <div className="rounded-md border border-gray-100 p-2.5 dark:border-gray-800">
      {/* Header del componente */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {COMPONENT_LABELS[component.componentType] ?? component.componentType}
          </span>
          {component.label && (
            <span className="text-xs text-gray-400">{component.label}</span>
          )}
          {component.quantity > 1 && (
            <span className="rounded bg-gray-100 px-1.5 text-xs text-gray-500 dark:bg-gray-800">
              ×{component.quantity}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{component.widthCm.toFixed(1)} × {component.heightCm.toFixed(1)} cm</span>
          <span>{areaM2.toFixed(3)} m²</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            ${Number(component.totalPrice).toLocaleString("es-CO")}
          </span>
        </div>
      </div>

      {/* Selección de material y acabado */}
      <div className="grid grid-cols-2 gap-2">
        {/* Material del tablero */}
        <div>
          <p className="mb-1 text-xs text-gray-400">Tablero</p>
          <div className="flex items-center gap-1.5">
            {component.material && (
              <MaterialSwatch color={component.material.color} textureUrl={component.material.textureUrl} size="sm" />
            )}
            <select
              value={component.materialId ?? ""}
              onChange={e => updateComponent.mutate({
                componentId: component.id,
                materialId: e.target.value || null,
                surfaceFinishId: component.surfaceFinishId,
              })}
              className="flex-1 rounded border border-gray-200 bg-white py-1 pl-2 pr-6 text-xs text-gray-700 focus:border-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value="">— Sin material —</option>
              {catalog?.materials.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} (${Number(m.pricePerM2).toFixed(0)}/m²)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Acabado superficial */}
        <div>
          <p className="mb-1 text-xs text-gray-400">Acabado</p>
          <div className="flex items-center gap-1.5">
            {component.surfaceFinish && (
              <MaterialSwatch color={component.surfaceFinish.color} textureUrl={component.surfaceFinish.textureUrl} size="sm" />
            )}
            <select
              value={component.surfaceFinishId ?? ""}
              onChange={e => updateComponent.mutate({
                componentId: component.id,
                materialId: component.materialId,
                surfaceFinishId: e.target.value || null,
              })}
              className="flex-1 rounded border border-gray-200 bg-white py-1 pl-2 pr-6 text-xs text-gray-700 focus:border-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value="">— Sin acabado —</option>
              {catalog?.surfaceFinishes.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name} (${Number(f.pricePerM2).toFixed(0)}/m²)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Cantos */}
      {component.edges.length > 0 && (
        <div className="mt-2 space-y-1">
          {component.edges.map(edge => (
            <EdgeRow key={edge.id} edge={edge} catalog={catalog} />
          ))}
        </div>
      )}
    </div>
  );
}

function EdgeRow({ edge, catalog }: {
  edge: Component["edges"][number];
  catalog: RouterOutputs["catalog"]["getFullCatalog"] | undefined;
}) {
  const { invalidate } = useQuoteBuilder();
  const updateEdge = api.quotes.updateEdge.useMutation({ onSuccess: invalidate });

  const sideLabel: Record<string, string> = {
    TOP: "Sup.", BOTTOM: "Inf.", LEFT: "Izq.", RIGHT: "Der."
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-8 shrink-0 text-gray-400">{sideLabel[edge.edgeSide]}</span>
      <span className="text-gray-500">{edge.lengthML.toFixed(2)} ml</span>
      <select
        value={edge.edgeTreatmentId}
        onChange={e => updateEdge.mutate({ edgeId: edge.id, edgeTreatmentId: e.target.value })}
        className="flex-1 rounded border border-gray-100 bg-white py-0.5 pl-1.5 pr-5 text-xs text-gray-600 focus:outline-none dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300"
      >
        {catalog?.edgeTreatments.map(et => (
          <option key={et.id} value={et.id}>{et.name}</option>
        ))}
      </select>
      <span className="shrink-0 text-gray-500">${Number(edge.totalPrice).toLocaleString("es-CO")}</span>
    </div>
  );
}