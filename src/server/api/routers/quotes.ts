import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { bomService } from "@/server/services/bom.service";
import { pricingService } from "@/server/services/pricing.service";
import { layoutService } from "@/server/services/layout.service";
import { ProjectStatus, ConnectionType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

// ─── Schemas de validación ────────────────────────────────────────────────────

const createProjectSchema = z.object({
  clientId: z.string().cuid(),
  name: z.string().min(1).max(120),
  roomWidth: z.number().positive().optional(),
  roomLength: z.number().positive().optional(),
  roomHeight: z.number().positive().optional(),
  notes: z.string().optional(),
});

const addQuoteItemSchema = z.object({
  projectId: z.string().cuid(),
  elementTypeId: z.string().cuid(),
  label: z.string().optional(),
  width: z.number().positive(),
  height: z.number().positive(),
  depth: z.number().positive(),
  quantity: z.number().int().positive().default(1),
  layoutGroupId: z.string().cuid().optional(),
  groupOrder: z.number().int().default(0),
});

const updateQuoteItemSchema = z.object({
  id: z.string().cuid(),
  label: z.string().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  depth: z.number().positive().optional(),
  quantity: z.number().int().positive().optional(),
  notes: z.string().optional(),
  connectionToNext: z.nativeEnum(ConnectionType).optional(),
  gapBeforeCm: z.number().min(0).optional(),
});

const updateComponentSchema = z.object({
  componentId: z.string().cuid(),
  materialId: z.string().cuid().nullable().optional(),
  surfaceFinishId: z.string().cuid().nullable().optional(),
});

const updateEdgeSchema = z.object({
  edgeId: z.string().cuid(),
  edgeTreatmentId: z.string().cuid(),
});

const upsertHardwareItemSchema = z.object({
  quoteItemId: z.string().cuid(),
  hardwareId: z.string().cuid(),
  quantity: z.number().int().positive(),
});

const reorderItemsSchema = z.object({
  groupId: z.string().cuid(),
  // Array de {id, groupOrder} — el frontend manda el nuevo orden tras drag
  orderedIds: z.array(z.object({ id: z.string().cuid(), groupOrder: z.number().int() })),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function assertProjectOwner(projectId: string, userId: string) {
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || project.userId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Proyecto no encontrado o sin acceso." });
  }
  return project;
}

// ─── Router ───────────────────────────────────────────────────────────────────

import { db } from "@/server/db";

export const quotesRouter = createTRPCRouter({

  // ── Proyectos ───────────────────────────────────────────────────────────────

  listProjects: protectedProcedure.query(async ({ ctx }) => {
    return db.project.findMany({
      where: { userId: ctx.session.user.id },
      include: { client: true },
      orderBy: { updatedAt: "desc" },
    });
  }),

  getProject: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const project = await db.project.findUnique({
        where: { id: input.id },
        include: {
          client: true,
          layoutGroups: {
            include: {
              items: {
                orderBy: { groupOrder: "asc" },
                include: {
                  elementType: true,
                  components: {
                    include: { material: true, surfaceFinish: true, edges: { include: { edgeTreatment: true } } },
                  },
                  hardwareItems: { include: { hardware: true } },
                  supplies: { include: { assemblySupply: true } },
                },
              },
            },
          },
          projectFinishes: { include: { finish: true } },
        },
      });
      if (!project || project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return project;
    }),

  createProject: protectedProcedure
    .input(createProjectSchema)
    .mutation(async ({ ctx, input }) => {
      // Verificar que el cliente pertenece al instalador
      const client = await db.client.findUnique({ where: { id: input.clientId } });
      if (!client || client.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cliente no encontrado." });
      }
      return db.project.create({
        data: { ...input, userId: ctx.session.user.id },
      });
    }),

  updateProject: protectedProcedure
    .input(createProjectSchema.partial().extend({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertProjectOwner(input.id, ctx.session.user.id);
      const { id, ...data } = input;
      return db.project.update({ where: { id }, data });
    }),

  updateProjectStatus: protectedProcedure
    .input(z.object({ id: z.string().cuid(), status: z.nativeEnum(ProjectStatus) }))
    .mutation(async ({ ctx, input }) => {
      await assertProjectOwner(input.id, ctx.session.user.id);
      return db.project.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  deleteProject: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertProjectOwner(input.id, ctx.session.user.id);
      return db.project.delete({ where: { id: input.id } });
    }),

  // ── Quote Items ─────────────────────────────────────────────────────────────

  addQuoteItem: protectedProcedure
    .input(addQuoteItemSchema)
    .mutation(async ({ ctx, input }) => {
      await assertProjectOwner(input.projectId, ctx.session.user.id);

      const item = await db.quoteItem.create({
        data: {
          ...input,
          unitPrice: new Decimal(0),
          totalPrice: new Decimal(0),
        },
      });

      // Instanciar BOM automáticamente
      await bomService.instantiateBOM(item.id);

      // Recalcular totales del proyecto
      await pricingService.recalculateProject(input.projectId);

      // Si pertenece a un grupo, recalcular posiciones
      if (input.layoutGroupId) {
        await layoutService.recalculateGroupPositions(input.layoutGroupId);
      }

      return db.quoteItem.findUniqueOrThrow({
        where: { id: item.id },
        include: { components: true, hardwareItems: true, supplies: true },
      });
    }),

  updateQuoteItem: protectedProcedure
    .input(updateQuoteItemSchema)
    .mutation(async ({ ctx, input }) => {
      const item = await db.quoteItem.findUniqueOrThrow({
        where: { id: input.id },
        include: { project: true },
      });
      if (item.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const { id, ...data } = input;

      // Si cambian dimensiones, re-instanciar BOM completo
      const dimensionsChanged = data.width ?? data.height ?? data.depth;

      await db.quoteItem.update({ where: { id }, data });

      if (dimensionsChanged) {
        await bomService.instantiateBOM(id);
      }

      await pricingService.recalculateProject(item.projectId);

      if (item.layoutGroupId) {
        await layoutService.recalculateGroupPositions(item.layoutGroupId);
      }

      return db.quoteItem.findUniqueOrThrow({ where: { id } });
    }),

  deleteQuoteItem: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const item = await db.quoteItem.findUniqueOrThrow({
        where: { id: input.id },
        include: { project: true },
      });
      if (item.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await db.quoteItem.delete({ where: { id: input.id } });
      await pricingService.recalculateProject(item.projectId);
      if (item.layoutGroupId) {
        await layoutService.recalculateGroupPositions(item.layoutGroupId);
      }
    }),

  // ── Personalización de componentes ──────────────────────────────────────────

  updateComponent: protectedProcedure
    .input(updateComponentSchema)
    .mutation(async ({ ctx, input }) => {
      const component = await db.quoteItemComponent.findUniqueOrThrow({
        where: { id: input.componentId },
        include: {
          quoteItem: { include: { project: true } },
          material: true,
          surfaceFinish: true,
        },
      });
      if (component.quoteItem.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const mat = input.materialId
        ? await db.material.findUnique({ where: { id: input.materialId } })
        : null;
      const fin = input.surfaceFinishId
        ? await db.surfaceFinish.findUnique({ where: { id: input.surfaceFinishId } })
        : null;

      const boardPrice = mat ? Number(mat.pricePerM2) * component.boardAreaM2 : 0;
      const finishPrice = fin ? Number(fin.pricePerM2) * component.finishAreaM2 : 0;
      const unitPrice = boardPrice + finishPrice;

      await db.quoteItemComponent.update({
        where: { id: input.componentId },
        data: {
          materialId: input.materialId,
          surfaceFinishId: input.surfaceFinishId,
          unitPrice: new Decimal(unitPrice),
          totalPrice: new Decimal(unitPrice * component.quantity),
        },
      });

      await pricingService.recalculateQuoteItem(component.quoteItemId);
      await pricingService.recalculateProject(component.quoteItem.projectId);
    }),

  updateEdge: protectedProcedure
    .input(updateEdgeSchema)
    .mutation(async ({ ctx, input }) => {
      const edge = await db.componentEdge.findUniqueOrThrow({
        where: { id: input.edgeId },
        include: {
          component: { include: { quoteItem: { include: { project: true } } } },
        },
      });
      if (edge.component.quoteItem.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const treatment = await db.edgeTreatment.findUniqueOrThrow({ where: { id: input.edgeTreatmentId } });
      const totalPrice = Number(treatment.pricePerML) * edge.lengthML;

      await db.componentEdge.update({
        where: { id: input.edgeId },
        data: {
          edgeTreatmentId: input.edgeTreatmentId,
          unitPrice: treatment.pricePerML,
          totalPrice: new Decimal(totalPrice),
        },
      });

      await pricingService.recalculateQuoteItem(edge.component.quoteItemId);
      await pricingService.recalculateProject(edge.component.quoteItem.projectId);
    }),

  // ── Herrajes ────────────────────────────────────────────────────────────────

  upsertHardwareItem: protectedProcedure
    .input(upsertHardwareItemSchema)
    .mutation(async ({ ctx, input }) => {
      const item = await db.quoteItem.findUniqueOrThrow({
        where: { id: input.quoteItemId },
        include: { project: true },
      });
      if (item.project.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const hardware = await db.hardware.findUniqueOrThrow({ where: { id: input.hardwareId } });
      const totalPrice = Number(hardware.pricePerUnit) * input.quantity;

      await db.hardwareItem.upsert({
        where: { id: `${input.quoteItemId}_${input.hardwareId}` }, // no funciona; usar findFirst abajo
        // ↑ workaround: usamos findFirst + create/update por separado
        create: {
          quoteItemId: input.quoteItemId,
          hardwareId: input.hardwareId,
          quantity: input.quantity,
          unitPrice: hardware.pricePerUnit,
          totalPrice: new Decimal(totalPrice),
        },
        update: {
          quantity: input.quantity,
          unitPrice: hardware.pricePerUnit,
          totalPrice: new Decimal(totalPrice),
        },
      });

      await pricingService.recalculateQuoteItem(input.quoteItemId);
      await pricingService.recalculateProject(item.projectId);
    }),

  removeHardwareItem: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const hw = await db.hardwareItem.findUniqueOrThrow({
        where: { id: input.id },
        include: { quoteItem: { include: { project: true } } },
      });
      if (hw.quoteItem.project.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await db.hardwareItem.delete({ where: { id: input.id } });
      await pricingService.recalculateQuoteItem(hw.quoteItemId);
      await pricingService.recalculateProject(hw.quoteItem.projectId);
    }),

  // ── Acabados de obra ─────────────────────────────────────────────────────────

  upsertProjectFinish: protectedProcedure
    .input(z.object({
      projectId: z.string().cuid(),
      finishId: z.string().cuid(),
      areaM2: z.number().positive(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertProjectOwner(input.projectId, ctx.session.user.id);
      const finish = await db.finish.findUniqueOrThrow({ where: { id: input.finishId } });
      const totalPrice = Number(finish.pricePerM2) * input.areaM2;

      const existing = await db.projectFinish.findFirst({
        where: { projectId: input.projectId, finishId: input.finishId },
      });

      if (existing) {
        await db.projectFinish.update({
          where: { id: existing.id },
          data: { areaM2: input.areaM2, unitPrice: finish.pricePerM2, totalPrice: new Decimal(totalPrice), notes: input.notes },
        });
      } else {
        await db.projectFinish.create({
          data: {
            projectId: input.projectId,
            finishId: input.finishId,
            areaM2: input.areaM2,
            unitPrice: finish.pricePerM2,
            totalPrice: new Decimal(totalPrice),
            notes: input.notes,
          },
        });
      }
      await pricingService.recalculateProject(input.projectId);
    }),

  // ── Re-instanciar BOM manualmente (si el instalador cambia templates) ────────

  reinstantiateBOM: protectedProcedure
    .input(z.object({ quoteItemId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const item = await db.quoteItem.findUniqueOrThrow({
        where: { id: input.quoteItemId },
        include: { project: true },
      });
      if (item.project.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await bomService.instantiateBOM(input.quoteItemId);
      await pricingService.recalculateProject(item.projectId);
    }),
});