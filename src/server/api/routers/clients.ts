// src/server/api/routers/clients.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";

export const clientsRouter = createTRPCRouter({
  list: protectedProcedure.query(({ ctx }) =>
    db.client.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { name: "asc" },
    })
  ),

  create: protectedProcedure
    .input(z.object({
      name:    z.string().min(1),
      email:   z.string().email().optional(),
      phone:   z.string().optional(),
      address: z.string().optional(),
    }))
    .mutation(({ ctx, input }) =>
      db.client.create({ data: { ...input, userId: ctx.session.user.id } })
    ),

  update: protectedProcedure
    .input(z.object({
      id:      z.string().cuid(),
      name:    z.string().min(1).optional(),
      email:   z.string().email().optional(),
      phone:   z.string().optional(),
      address: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return db.client.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(({ ctx, input }) =>
      db.client.delete({ where: { id: input.id } })
    ),
});