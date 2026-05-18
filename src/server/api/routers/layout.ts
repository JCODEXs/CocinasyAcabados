import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { layoutService } from "@/server/services/layout.service";
import { GroupType, ConnectionType } from "@prisma/client";
import { db } from "@/server/db";

export const layoutRouter = createTRPCRouter({
  

  createGroup: protectedProcedure
    .input(z.object({
      projectId: z.string().cuid(),
      name: z.string().min(1),
      type:  z.nativeEnum(GroupType),
      startX: z.number().default(0),
      startY: z.number().default(0),
      baseAngle: z.number().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
        console.log("userId desde sesión:", ctx.session.user.id);
    console.log("input recibido:", input);
      const project = await db.project.findUnique({ where: { id: input.projectId } });
      if ( project?.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const count = await db.layoutGroup.count({ where: { projectId: input.projectId } });
      return db.layoutGroup.create({ data: { ...input, sortOrder: count } });
    }),

  updateGroup: protectedProcedure
    .input(z.object({
      id: z.string().cuid(),
      name: z.string().optional(),
      startX: z.number().optional(),
      startY: z.number().optional(),
      baseAngle: z.number().optional(),
      type: z.nativeEnum(GroupType).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const group = await db.layoutGroup.findUniqueOrThrow({
        where:  { id: input.id },
        select: { project: { select: { userId: true } } },
      });
      if (group.project.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const { id, ...data } = input;
      const needsRecalc =
        data.startX !== undefined || data.startY !== undefined || data.baseAngle !== undefined;

      // Una sola transacción: actualiza grupo → recalcula posiciones si aplica
      const { updatedGroup, items } = await db.$transaction(async (tx) => {
        const updatedGroup = await tx.layoutGroup.update({ where: { id }, data });
        const items = needsRecalc
          ? await layoutService.recalculateGroupPositions(id, tx)
          : [];
        return { updatedGroup, items };
      }, { timeout: 30000 });

      return { group: updatedGroup, items };
    }),

  // Crear giro en L: nuevo grupo posicionado al final del actual con +90° o -90°
  createLTurn: protectedProcedure
    .input(z.object({
      sourceGroupId: z.string().cuid(),
      direction:     z.enum(["LEFT", "RIGHT"]).default("RIGHT"),
      name:          z.string().min(1).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const source = await db.layoutGroup.findUniqueOrThrow({
        where:  { id: input.sourceGroupId },
        select: { projectId: true, name: true, type: true, project: { select: { userId: true } } },
      });
      if (source.project.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      // Calcular endpoint del grupo origen y ángulo perpendicular
      const endpoint = await layoutService.getGroupEndpoint(input.sourceGroupId);
      const turnDelta = input.direction === "RIGHT" ? -90 : 90;
      const newAngle = endpoint.angle + turnDelta;

      const count = await db.layoutGroup.count({ where: { projectId: source.projectId } });

      return db.layoutGroup.create({
        data: {
          projectId: source.projectId,
          name:      input.name ?? `${source.name} (giro)`,
          type:      source.type,
          startX:    parseFloat(endpoint.x.toFixed(4)),
          startY:    parseFloat(endpoint.z.toFixed(4)),
          baseAngle: newAngle,
          sortOrder: count,
        },
      });
    }),

  deleteGroup: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const group = await db.layoutGroup.findUniqueOrThrow({
        where: { id: input.id },
        include: { project: true },
      });
      if (group.project.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      // Desasociar items del grupo antes de borrar
      await db.quoteItem.updateMany({
        where: { layoutGroupId: input.id },
        data: { layoutGroupId: null, groupOrder: 0, connectionToNext: "END" },
      });
      return db.layoutGroup.delete({ where: { id: input.id } });
    }),

  // Drag-and-drop: recibir nuevo orden completo del grupo
  reorderItems: protectedProcedure
    .input(z.object({
      groupId: z.string().cuid(),
      orderedIds: z.array(z.object({
        id: z.string().cuid(),
        groupOrder: z.number().int(),
        connectionToNext: z.nativeEnum(ConnectionType).optional(),
        gapBeforeCm: z.number().min(0).optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const group = await db.layoutGroup.findUniqueOrThrow({
        where: { id: input.groupId },
        include: { project: true },
      });
      if (group.project.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      await db.$transaction(
        input.orderedIds.map((item) =>
          db.quoteItem.update({
            where: { id: item.id },
            data: {
              groupOrder: item.groupOrder,
              connectionToNext: item.connectionToNext,
              gapBeforeCm: item.gapBeforeCm,
            },
          })
        )
      );

      await layoutService.recalculateGroupPositions(input.groupId);
    }),

  // Mover item a otro grupo o sacarlo de su grupo
  moveItemToGroup: protectedProcedure
    .input(z.object({
      itemId: z.string().cuid(),
      targetGroupId: z.string().cuid().nullable(),
      groupOrder: z.number().int().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const item = await db.quoteItem.findUniqueOrThrow({
        where: { id: input.itemId },
        include: { project: true },
      });
      if (item.project.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const oldGroupId = item.layoutGroupId;

      await db.quoteItem.update({
        where: { id: input.itemId },
        data: { layoutGroupId: input.targetGroupId, groupOrder: input.groupOrder },
      });

      // Recalcular ambos grupos
      if (oldGroupId) await layoutService.recalculateGroupPositions(oldGroupId);
      if (input.targetGroupId) await layoutService.recalculateGroupPositions(input.targetGroupId);
    }),
});