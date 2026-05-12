/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// import { useCallback } from "react";
import { api } from "@/trpc/react";
import { useQuoteBuilder } from "../../context";

export function useOptimisticComponent(componentId: string) {
  const utils = api.useUtils();
  const { projectId, refetchProject } = useQuoteBuilder();

  const updateComponent = api.quotes.updateComponent.useMutation({
    onMutate: async (variables) => {
      await utils.quotes.getProject.cancel({ id: projectId });
      const snapshot = utils.quotes.getProject.getData({ id: projectId });

      // Optimistically update material and surface finish IDs in cache
      utils.quotes.getProject.setData({ id: projectId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          layoutGroups: old.layoutGroups.map(group => ({
            ...group,
            items: group.items.map(item => ({
              ...item,
              components: item.components.map(comp =>
                comp.id !== componentId ? comp : {
                  ...comp,
                  materialId:      variables.materialId      ?? comp.materialId,
                  surfaceFinishId: variables.surfaceFinishId ?? comp.surfaceFinishId,
                  // Optimistically update the nested objects too so swatches update
                  // These will be corrected on settle with real server data
                  material: variables.materialId
                    ? (comp.material?.id === variables.materialId
                        ? comp.material
                        : null)  // will fill from cache on settle
                    : comp.material,
                  surfaceFinish: variables.surfaceFinishId
                    ? (comp.surfaceFinish?.id === variables.surfaceFinishId
                        ? comp.surfaceFinish
                        : null)
                    : comp.surfaceFinish,
                }
              ),
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

    onSettled: async () => {
      await refetchProject();
    },
  });

  return {
    updateComponent: updateComponent.mutate,
    isPending:       updateComponent.isPending,
  };
}