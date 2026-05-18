import { api } from "@/trpc/react";
import { useQuoteBuilder } from "../../context";
import type { RouterOutputs } from "@/trpc/react";

type CatalogMaterial     = RouterOutputs["catalog"]["getFullCatalog"]["materials"][number];
type CatalogSurfaceFinish = RouterOutputs["catalog"]["getFullCatalog"]["surfaceFinishes"][number];

export function useOptimisticComponent(componentId: string) {
  const utils = api.useUtils();
  const { projectId, catalog, invalidateProject } = useQuoteBuilder();

  const updateComponent = api.quotes.updateComponent.useMutation({
    onMutate: async (variables) => {
      await utils.quotes.getProject.cancel({ id: projectId });
      const snapshot = utils.quotes.getProject.getData({ id: projectId });

      // Resolver material/acabado desde el catálogo local para que el swatch
      // se actualice INMEDIATAMENTE sin parpadeo ni swatch vacío.
      const newMaterial: CatalogMaterial | null | undefined =
        variables.materialId === null
          ? null
          : variables.materialId !== undefined
            ? (catalog?.materials.find(m => m.id === variables.materialId) ?? undefined)
            : undefined; // undefined = sin cambio

      const newFinish: CatalogSurfaceFinish | null | undefined =
        variables.surfaceFinishId === null
          ? null
          : variables.surfaceFinishId !== undefined
            ? (catalog?.surfaceFinishes.find(f => f.id === variables.surfaceFinishId) ?? undefined)
            : undefined;

      utils.quotes.getProject.setData({ id: projectId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          layoutGroups: old.layoutGroups.map(group => ({
            ...group,
            items: group.items.map(item => ({
              ...item,
              components: item.components.map(comp => {
                if (comp.id !== componentId) return comp;

                // Calcular precio optimista con los mismos boardAreaM2/finishAreaM2
                const matPrice = newMaterial !== undefined
                  ? Number(newMaterial?.pricePerM2 ?? 0) * comp.boardAreaM2
                  : Number(comp.material?.pricePerM2 ?? 0) * comp.boardAreaM2;
                const finPrice = newFinish !== undefined
                  ? Number(newFinish?.pricePerM2 ?? 0) * comp.finishAreaM2
                  : Number(comp.surfaceFinish?.pricePerM2 ?? 0) * comp.finishAreaM2;
                const newUnitPrice  = matPrice + finPrice;
                const newTotalPrice = newUnitPrice * comp.quantity;

                return {
                  ...comp,
                  materialId:      newMaterial  !== undefined ? (newMaterial?.id  ?? null) : comp.materialId,
                  surfaceFinishId: newFinish    !== undefined ? (newFinish?.id    ?? null) : comp.surfaceFinishId,
                  material:        newMaterial  !== undefined ? (newMaterial ?? null)      : comp.material,
                  surfaceFinish:   newFinish    !== undefined ? (newFinish   ?? null)      : comp.surfaceFinish,
                  unitPrice:       newUnitPrice  as unknown as typeof comp.unitPrice,
                  totalPrice:      newTotalPrice as unknown as typeof comp.totalPrice,
                };
              }),
            })),
          })),
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
      // Mergear datos reales del servidor directamente en el cache —
      // sin refetch: el servidor ya retorna el componente, item y totales actualizados.
      utils.quotes.getProject.setData({ id: projectId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          // Actualizar totales del proyecto
          subtotal: result.project.subtotal as unknown as typeof old.subtotal,
          tax:      result.project.tax      as unknown as typeof old.tax,
          total:    result.project.total    as unknown as typeof old.total,
          layoutGroups: old.layoutGroups.map(group => ({
            ...group,
            items: group.items.map(item => {
              if (item.id !== result.item.id) return item;
              return {
                ...item,
                unitPrice:  result.item.unitPrice  as unknown as typeof item.unitPrice,
                totalPrice: result.item.totalPrice as unknown as typeof item.totalPrice,
                components: item.components.map(comp =>
                  comp.id !== result.component.id ? comp : {
                    ...comp,
                    ...result.component,
                  }
                ),
              };
            }),
          })),
        };
      });

      // Invalidar en background como safety net (no bloquea la UI)
      void invalidateProject();
    },
  });

  return {
    updateComponent: updateComponent.mutate,
    isPending:       updateComponent.isPending,
  };
}