// src/server/api/routers/clients.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";

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
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      
      // Check if the client exists and belongs to the current user
      const client = await db.client.findFirst({
        where: { 
          id: id,
          userId: ctx.session.user.id 
        }
      });
      
      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client not found or you don't have permission to update it",
        });
      }
      
      return db.client.update({ where: { id }, data });
    }),

 delete: protectedProcedure
  .input(z.object({ id: z.string().cuid() }))
  .mutation(async ({ ctx, input }) => {
    return db.$transaction(async (tx) => {
      // Try to delete and check if any record was deleted
      const result = await tx.client.deleteMany({
        where: { 
          id: input.id,
          userId: ctx.session.user.id 
        }
      });
      
      if (result.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client not found or you don't have permission to delete it",
        });
      }
      
      return result;
    });
  }),
});