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
      type: z.nativeEnum(GroupType),
      startX: z.number().default(0),
      startY: z.number().default(0),
      baseAngle: z.number().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await db.project.findUnique({ where: { id: input.projectId } });
      if (!project || project.userId !== ctx.session.user.id) {
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
        where: { id: input.id },
        include: { project: true },
      });
      if (group.project.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const { id, ...data } = input;
      await db.layoutGroup.update({ where: { id }, data });

      // Recalcular posiciones si cambia origen o ángulo
      if (data.startX !== undefined || data.startY !== undefined || data.baseAngle !== undefined) {
        await layoutService.recalculateGroupPositions(id);
      }
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