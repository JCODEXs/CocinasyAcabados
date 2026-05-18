/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useCallback } from "react";
import { api } from "@/trpc/react";
import { useQuoteBuilder } from "../../context";
import type { RouterOutputs } from "@/trpc/react";

type Project = RouterOutputs["quotes"]["getProject"];
type Group   = Project["layoutGroups"][number];

type GroupPatch = Partial<Pick<Group, "name" | "startX" | "startY" | "baseAngle" | "type">>;

// ─── Recalcula posiciones de items en cliente (espejo de layout.service.ts) ───
//     Permite que el 3D refleje el movimiento del grupo sin esperar al servidor.
const CORNER_DELTAS: Record<string, number> = {
  CORNER_90R: -90,
  CORNER_90L:  90,
  CORNER_45:  -45,
};
const RAD = Math.PI / 180;

function recalculateItemPositions(group: Group): Group["items"] {
  let curX = group.startX;
  let curZ = group.startY;
  let angleDeg = group.baseAngle;

  return group.items.map((item) => {
    const rad = angleDeg * RAD;
    curX += Math.cos(rad) * item.gapBeforeCm;
    curZ += Math.sin(rad) * item.gapBeforeCm;

    const posX = parseFloat(curX.toFixed(4));
    const posZ = parseFloat(curZ.toFixed(4));
    const rotationY = angleDeg;

    curX += Math.cos(rad) * item.width;
    curZ += Math.sin(rad) * item.width;

    const delta = CORNER_DELTAS[item.connectionToNext as string];
    if (delta !== undefined) angleDeg += delta;

    return { ...item, posX, posZ, rotationY };
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOptimisticGroup(groupId: string) {
  const utils = api.useUtils();
  const { projectId, invalidateProject } = useQuoteBuilder();

  const applyOptimistic = useCallback(
    (patch: GroupPatch) => {
      utils.quotes.getProject.setData({ id: projectId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          layoutGroups: old.layoutGroups.map((g) => {
            if (g.id !== groupId) return g;
            const patched: Group = { ...g, ...patch };
            // Si cambia origen o ángulo, recalcular items localmente
            const needsRecalc =
              patch.startX !== undefined ||
              patch.startY !== undefined ||
              patch.baseAngle !== undefined;
            return needsRecalc
              ? { ...patched, items: recalculateItemPositions(patched) }
              : patched;
          }),
        };
      });
    },
    [utils, projectId, groupId],
  );

  const updateGroup = api.layout.updateGroup.useMutation({
    onMutate: async (variables) => {
      await utils.quotes.getProject.cancel({ id: projectId });
      const snapshot = utils.quotes.getProject.getData({ id: projectId });
      const { id: _id, ...patch } = variables;
      applyOptimistic(patch);
      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshot) {
        utils.quotes.getProject.setData({ id: projectId }, context.snapshot);
      }
    },

    onSuccess: (result) => {
      // Reemplazar con los datos exactos del servidor (group + posiciones)
      utils.quotes.getProject.setData({ id: projectId }, (old) => {
        if (!old) return old;
        const positionsById = new Map(result.items.map((p) => [p.id, p]));
        return {
          ...old,
          layoutGroups: old.layoutGroups.map((g) => {
            if (g.id !== result.group.id) return g;
            return {
              ...g,
              name:      result.group.name,
              startX:    result.group.startX,
              startY:    result.group.startY,
              baseAngle: result.group.baseAngle,
              type:      result.group.type,
              items: g.items.map((it) => {
                const p = positionsById.get(it.id);
                return p
                  ? { ...it, posX: p.posX, posY: p.posY, posZ: p.posZ, rotationY: p.rotationY }
                  : it;
              }),
            };
          }),
        };
      });

      // Safety-net en background
      void invalidateProject();
    },
  });

  const createLTurn = api.layout.createLTurn.useMutation({
    onSuccess: () => invalidateProject(),
  });

  const setPosition = useCallback(
    (patch: Pick<GroupPatch, "startX" | "startY" | "baseAngle">) => {
      updateGroup.mutate({ id: groupId, ...patch });
    },
    [updateGroup, groupId],
  );

  return {
    setPosition,
    updateGroup:  updateGroup.mutate,
    createLTurn:  createLTurn.mutate,
    isPending:    updateGroup.isPending || createLTurn.isPending,
  };
}
