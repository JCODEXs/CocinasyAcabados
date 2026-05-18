
"use client";

import { useQuoteBuilder } from "./context";
import { useOptimisticComponent } from "./ui/hooks/useOptimisticComponent";
import { MaterialSwatch } from "./ui/MaterialSwatch";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";

type Component = RouterOutputs["quotes"]["getProject"]["layoutGroups"][number]["items"][number]["components"][number];

const COMPONENT_LABELS: Record<string, string> = {
  LATERAL: "Lateral", FONDO: "Fondo", TECHO: "Techo", PISO: "Piso",
  ENTREPAÑO: "Entrepaño", PUERTA: "Puerta", FRENTE_CAJON: "Frente cajón",
  CAJA_CAJON: "Caja cajón", MESON: "Mesón", ZOCALO: "Zócalo",
  DIVISION: "División", RIEL: "Riel",
};

export function ComponentEditor({ component }: { component: Component }) {
  const { catalog } = useQuoteBuilder();
  const { updateComponent, isPending } = useOptimisticComponent(component.id);

  // component prop comes from cache — always up to date after optimistic update
  // No local state needed for materialId or surfaceFinishId

  // Resolve display objects from catalog using IDs from cache
  const displayMaterial      = catalog?.materials.find(m => m.id === component.materialId);
  const displaySurfaceFinish = catalog?.surfaceFinishes.find(f => f.id === component.surfaceFinishId);

  const handleMaterialChange = (materialId: string | null) => {
    updateComponent({
      componentId:     component.id,
      materialId,
      surfaceFinishId: component.surfaceFinishId,
    });
  };

  const handleFinishChange = (surfaceFinishId: string | null) => {
    updateComponent({
      componentId: component.id,
      materialId:  component.materialId,
      surfaceFinishId,
    });
  };

  return (
    <div className="rounded-md border border-gray-100 p-2.5 dark:border-gray-800">
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
          {/* Pending indicator — dot instead of spinner to not distract */}
          {isPending && (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" title="Guardando..." />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{component.widthCm.toFixed(1)} × {component.heightCm.toFixed(1)} cm</span>
          <span className="text-gray-300">{component.boardAreaM2.toFixed(3)} m²</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-xs text-gray-400">Tablero</p>
          <div className="flex items-center gap-1.5">
            {/* Swatch reads from cache — updates immediately after onMutate */}
            <MaterialSwatch
              color={displayMaterial?.color ?? null}
              textureUrl={displayMaterial?.textureUrl ?? null}
              size="sm"
            />
            <select
              value={component.materialId ?? ""}
              onChange={e => handleMaterialChange(e.target.value || null)}
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

        <div>
          <p className="mb-1 text-xs text-gray-400">Acabado</p>
          <div className="flex items-center gap-1.5">
            <MaterialSwatch
              color={displaySurfaceFinish?.color ?? null}
              textureUrl={displaySurfaceFinish?.textureUrl ?? null}
              size="sm"
            />
            <select
              value={component.surfaceFinishId ?? ""}
              onChange={e => handleFinishChange(e.target.value || null)}
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

      {component.edges.length > 0 && (
        <div className="mt-2 space-y-1">
          {component.edges.map(edge => (
            <EdgeRow key={edge.id} edge={edge} />
          ))}
        </div>
      )}
    </div>
  );
}

function EdgeRow({ edge }: {
  edge: RouterOutputs["quotes"]["getProject"]["layoutGroups"][number]["items"][number]["components"][number]["edges"][number];
}) {
  const { catalog, projectId, invalidateProject } = useQuoteBuilder();
  const utils = api.useUtils();

  const updateEdge = api.quotes.updateEdge.useMutation({
    onMutate: async (variables) => {
      await utils.quotes.getProject.cancel({ id: projectId });
      const snapshot = utils.quotes.getProject.getData({ id: projectId });

      // Optimistic: actualizar edgeTreatmentId y nombre visualmente desde el catálogo
      const newTreatment = catalog?.edgeTreatments.find(et => et.id === variables.edgeTreatmentId);

      utils.quotes.getProject.setData({ id: projectId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          layoutGroups: old.layoutGroups.map(g => ({
            ...g,
            items: g.items.map(item => ({
              ...item,
              components: item.components.map(comp => ({
                ...comp,
                edges: comp.edges.map(e =>
                  e.id !== edge.id ? e : {
                    ...e,
                    edgeTreatmentId: variables.edgeTreatmentId,
                    edgeTreatment:   newTreatment ?? e.edgeTreatment,
                    // Precio optimista: pricePerML × lengthML
                    totalPrice: newTreatment
                      ? (Number(newTreatment.pricePerML) * e.lengthML) as unknown as typeof e.totalPrice
                      : e.totalPrice,
                  }
                ),
              })),
            })),
          })),
        };
      });

      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) utils.quotes.getProject.setData({ id: projectId }, ctx.snapshot);
    },
    onSuccess: (result) => {
      utils.quotes.getProject.setData({ id: projectId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          subtotal: result.project.subtotal as unknown as typeof old.subtotal,
          tax:      result.project.tax      as unknown as typeof old.tax,
          total:    result.project.total    as unknown as typeof old.total,
          layoutGroups: old.layoutGroups.map(g => ({
            ...g,
            items: g.items.map(item => {
              if (item.id !== result.item.id) return item;
              return {
                ...item,
                unitPrice:  result.item.unitPrice  as unknown as typeof item.unitPrice,
                totalPrice: result.item.totalPrice as unknown as typeof item.totalPrice,
                components: item.components.map(comp =>
                  comp.id !== result.edge.componentId ? comp : {
                    ...comp,
                    edges: comp.edges.map(e =>
                      e.id !== result.edge.id ? e : { ...e, ...result.edge }
                    ),
                  }
                ),
              };
            }),
          })),
        };
      });
      void invalidateProject();
    },
  });

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
      <span className="shrink-0 text-gray-500">
        ${Number(edge.totalPrice).toLocaleString("es-CO")}
      </span>
    </div>
  );
}