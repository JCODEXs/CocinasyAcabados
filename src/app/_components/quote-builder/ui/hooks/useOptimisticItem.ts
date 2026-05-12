/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useCallback } from "react";
import { api } from "@/trpc/react";
import { useQuoteBuilder } from "../../context";
import type { RouterOutputs } from "@/trpc/react";

type Project   = RouterOutputs["quotes"]["getProject"];
type QuoteItem = Project["layoutGroups"][number]["items"][number];
type Component = QuoteItem["components"][number];

type DimensionPatch = Partial<Pick<QuoteItem,
  "width" | "height" | "depth" | "quantity" | "label" | "notes"
>>;

// ─── Evaluador de fórmulas — espejo exacto del servidor ──────────────────────
// Debe mantenerse en sync con bom.service.ts evalFormula

function evalFormula(formula: string, W: number, H: number, D: number): number {
  try {
    const result = Function(
      `"use strict"; const W=${W}, H=${H}, D=${D}; return (${formula})`
    )() as number;
    return Math.max(0, result);
  } catch {
    return 0;
  }
}

// ─── Recalcula dimensiones de componentes con nuevas dimensiones del item ─────

function recalculateComponents(
  components: Component[],
  catalog: RouterOutputs["catalog"]["getFullCatalog"] | undefined,
  elementTypeId: string,
  newW: number,
  newH: number,
  newD: number,
): Component[] {
  // Necesitamos los templates del elementType para saber las fórmulas
  const elementType = catalog?.elementTypes.find(et => et.id === elementTypeId);
  if (!elementType?.componentTemplates?.length) {
    // Sin templates en el catalog cache, no podemos recalcular
    // El servidor lo hará y onSettled traerá los datos correctos
    return components;
  }

  return components.map((comp, idx) => {
    // Buscar el template correspondiente por componentType y sortOrder
    const template = elementType.componentTemplates.find(
      (t, tIdx) =>
        t.componentType === comp.componentType &&
        // Match por índice si hay múltiples del mismo tipo (ej: 2 laterales)
        elementType.componentTemplates
          .filter(tt => tt.componentType === comp.componentType)
          .indexOf(t) ===
        components
          .filter(c => c.componentType === comp.componentType)
          .indexOf(comp)
    );

    if (!template) return comp;

    const newWidth  = evalFormula(template.widthFormula,  newW, newH, newD);
    const newHeight = evalFormula(template.heightFormula, newW, newH, newD);
    const newDepth  = evalFormula(template.depthFormula ?? "D", newW, newH, newD);

    const newBoardAreaM2  = (newWidth * newHeight * comp.quantity) / 10_000;
    const newFinishAreaM2 = newBoardAreaM2;

    // Recalcular precios con los mismos materiales actuales
    const matPrice = comp.material
      ? Number(comp.material.pricePerM2) * newBoardAreaM2
      : 0;
    const finPrice = comp.surfaceFinish
      ? Number(comp.surfaceFinish.pricePerM2) * newFinishAreaM2
      : 0;
    const newUnitPrice  = matPrice + finPrice;
    const newTotalPrice = newUnitPrice * comp.quantity;

    return {
      ...comp,
      widthCm:      newWidth,
      heightCm:     newHeight,
      boardAreaM2:  newBoardAreaM2,
      finishAreaM2: newFinishAreaM2,
      unitPrice:    newUnitPrice  as unknown as typeof comp.unitPrice,
      totalPrice:   newTotalPrice as unknown as typeof comp.totalPrice,
    };
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOptimisticItem(itemId: string) {
  const utils = api.useUtils();
  const { projectId, catalog, refetchProject } = useQuoteBuilder();

  const applyOptimistic = useCallback(
    (patch: DimensionPatch) => {
      utils.quotes.getProject.setData(
        { id: projectId },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            layoutGroups: old.layoutGroups.map(group => ({
              ...group,
              items: group.items.map(item => {
                if (item.id !== itemId) return item;

                // Dimensiones efectivas tras el patch
                const newW = patch.width    ?? item.width;
                const newH = patch.height   ?? item.height;
                const newD = patch.depth    ?? item.depth;

                // ── Recalcular componentes ───────────────────────────────
                const updatedComponents =
                  patch.width !== undefined ||
                  patch.height !== undefined ||
                  patch.depth !== undefined
                    ? recalculateComponents(
                        item.components,
                        catalog,
                        item.elementTypeId,
                        newW,
                        newH,
                        newD,
                      )
                    : item.components;

                return {
                  ...item,
                  ...patch,
                  components: updatedComponents,
                };
              }),
            })),
          };
        }
      );
    },
    [utils, projectId, itemId, catalog]
  );

  const updateItem = api.quotes.updateQuoteItem.useMutation({
    onMutate: async (variables) => {
      await utils.quotes.getProject.cancel({ id: projectId });
      const snapshot = utils.quotes.getProject.getData({ id: projectId });
      applyOptimistic(variables);
      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshot) {
        utils.quotes.getProject.setData({ id: projectId }, context.snapshot);
      }
    },

    onSettled: async () => {
      // Refetch trae los componentes recalculados por el servidor (BOM real)
      // Esto corrige cualquier diferencia entre la estimación optimista y el servidor
      await refetchProject();
    },
  });

  const updateDimension = useCallback(
    (field: "width" | "height" | "depth" | "quantity", value: number) => {
      updateItem.mutate({ id: itemId, [field]: value });
    },
    [updateItem, itemId]
  );

  return {
    updateDimension,
    updateItem:  updateItem.mutate,
    isPending:   updateItem.isPending,
  };
}