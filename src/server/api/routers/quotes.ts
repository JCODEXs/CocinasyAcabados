import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { Decimal } from "@prisma/client/runtime/library";
import { bomService }     from "@/server/services/bom.service";
import { pricingService } from "@/server/services/pricing.service";
import { layoutService }  from "@/server/services/layout.service";

// ─── Enums inline — nunca z.nativeEnum con Prisma ────────────────────────────

const ProjectStatusSchema = z.enum([
  "DRAFT", "SENT", "REVIEWING", "APPROVED",
  "REJECTED", "IN_PROGRESS", "COMPLETED",
]);

const ConnectionTypeSchema = z.enum([
  "INLINE", "CORNER_90R", "CORNER_90L", "CORNER_45", "GAP", "END",
]);

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createProjectSchema = z.object({
  clientId:   z.string().cuid(),
  name:       z.string().min(1).max(120),
  roomWidth:  z.number().positive().optional(),
  roomLength: z.number().positive().optional(),
  roomHeight: z.number().positive().optional(),
  notes:      z.string().optional(),
});

const addQuoteItemSchema = z.object({
  projectId:     z.string().cuid(),
  elementTypeId: z.string(),
  label:         z.string().optional(),
  width:         z.number().positive(),
  height:        z.number().positive(),
  depth:         z.number().positive(),
  quantity:      z.number().int().positive().default(1),
  layoutGroupId: z.string().cuid().optional(),
  groupOrder:    z.number().int().default(0),
});

const updateQuoteItemSchema = z.object({
  id:              z.string().cuid(),
  label:           z.string().optional(),
  width:           z.number().positive().optional(),
  height:          z.number().positive().optional(),
  depth:           z.number().positive().optional(),
  quantity:        z.number().int().positive().optional(),
  notes:           z.string().optional(),
  connectionToNext: ConnectionTypeSchema.optional(),   // ← z.enum, no z.nativeEnum
  gapBeforeCm:     z.number().min(0).optional(),
});

const updateComponentSchema = z.object({
  componentId:    z.string().cuid(),
  materialId:     z.string().cuid().nullable().optional(),
  surfaceFinishId:z.string().cuid().nullable().optional(),
});

const updateEdgeSchema = z.object({
  edgeId:          z.string().cuid(),
  edgeTreatmentId: z.string().cuid(),
});

const upsertHardwareItemSchema = z.object({
  quoteItemId: z.string().cuid(),
  hardwareId:  z.string().cuid(),
  quantity:    z.number().int().positive(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Retorna el proyecto si el usuario es dueño, lanza FORBIDDEN si no
async function assertProjectOwner(projectId: string, userId: string) {
  const project = await db.project.findUnique({
    where:  { id: projectId },
    select: { userId: true },
  });
  if (project?.userId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acceso denegado." });
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const quotesRouter = createTRPCRouter({

  // ── Proyectos ───────────────────────────────────────────────────────────────

  listProjects: protectedProcedure.query(({ ctx }) =>
    db.project.findMany({
      where:   { userId: ctx.session.user.id },
      include: { client: true },
      orderBy: { updatedAt: "desc" },
    })
  ),

  // Split fetch: evita el producto cartesiano de un único include gigante.
  // Project base + layoutGroups se traen en dos queries paralelas,
  // lo que reduce el tiempo de respuesta de ~1500ms a ~400ms en proyectos grandes.
  getProject: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const [project, layoutGroups] = await Promise.all([
        db.project.findUnique({
          where:   { id: input.id, userId: ctx.session.user.id },
          include: {
            client:         true,
            projectFinishes:{ include: { finish: true } },
          },
        }),
        db.layoutGroup.findMany({
          where:   { projectId: input.id },
          include: {
            items: {
              orderBy: { groupOrder: "asc" },
              include: {
                elementType:  true,
                components: {
                  include: {
                    material:     true,
                    surfaceFinish:true,
                    edges:        { include: { edgeTreatment: true } },
                  },
                },
                hardwareItems:{ include: { hardware: true } },
                supplies:     { include: { assemblySupply: true } },
              },
            },
          },
        }),
      ]);

      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      return { ...project, layoutGroups };
    }),

  createProject: protectedProcedure
    .input(createProjectSchema)
    .mutation(async ({ ctx, input }) => {
      // Un findFirst con userId evita una query separada de autorización
      const client = await db.client.findFirst({
        where: { id: input.clientId, userId: ctx.session.user.id },
        select: { id: true },
      });
      if (!client) throw new TRPCError({ code: "FORBIDDEN", message: "Cliente inválido." });

      return db.project.create({
        data: { ...input, userId: ctx.session.user.id },
      });
    }),

  updateProject: protectedProcedure
    .input(createProjectSchema.partial().extend({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      // El where compuesto elimina la query de assertProjectOwner
      return db.project.update({
        where: { id, userId: ctx.session.user.id },
        data,
      });
    }),

  updateProjectStatus: protectedProcedure
    .input(z.object({ id: z.string().cuid(), status: ProjectStatusSchema }))
    .mutation(({ ctx, input }) =>
      db.project.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data:  { status: input.status },
      })
    ),

  deleteProject: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(({ ctx, input }) =>
      db.project.delete({
        where: { id: input.id, userId: ctx.session.user.id },
      })
    ),

  // ── Quote Items ─────────────────────────────────────────────────────────────

  addQuoteItem: protectedProcedure
    .input(addQuoteItemSchema)
    .mutation(async ({ ctx, input }) => {
      await assertProjectOwner(input.projectId, ctx.session.user.id);

      // 1. Crear el item
      const item = await db.quoteItem.create({
        data: {
          ...input,
          unitPrice:  new Decimal(0),
          totalPrice: new Decimal(0),
        },
      });

      // 2. BOM — debe ir antes del pricing (pricing lee los componentes)
      await bomService.instantiateBOM(item.id);

      // 3. Recalculos — paralelos porque no se bloquean entre sí
      await Promise.all([
        pricingService.recalculateProject(input.projectId),
        input.layoutGroupId
          ? layoutService.recalculateGroupPositions(input.layoutGroupId)
          : Promise.resolve(),
      ]);

      // 4. Devolver el item con sus relaciones para que el frontend actualice la UI
      return db.quoteItem.findUniqueOrThrow({
        where:   { id: item.id },
        include: { components: true, hardwareItems: true, supplies: true },
      });
    }),

  updateQuoteItem: protectedProcedure
    .input(updateQuoteItemSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // 1. Auth — un fetch con join en lugar de assertProjectOwner separado
      const existing = await db.quoteItem.findUnique({
        where:  { id },
        select: { projectId: true, layoutGroupId: true, project: { select: { userId: true } } },
      });
      if (existing?.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // 2. Actualizar dimensiones/campos del item
      await db.quoteItem.update({ where: { id }, data });

      const dimensionsChanged =
        data.width !== undefined || data.height !== undefined || data.depth !== undefined;

      // 3. Si cambian dimensiones, regenerar BOM (transacción interna propia)
      if (dimensionsChanged) {
        await bomService.instantiateBOM(id);
      }

      // 4. Recalcular precios (item + proyecto) en una sola transacción
      //    y ejecutar recalcGroupPositions en paralelo (no bloquea precios)
      const [projectTotals] = await Promise.all([
        db.$transaction(async (tx) => {
          const itemPrices = await pricingService.recalculateQuoteItem(id, tx);
          const projTotals = await pricingService.recalculateProject(existing.projectId, tx);
          return { itemPrices, projTotals };
        }, { timeout: 30000 }),
        existing.layoutGroupId
          ? layoutService.recalculateGroupPositions(existing.layoutGroupId)
          : Promise.resolve(),
      ]);

      // 5. Devolver item completo con todo lo que el frontend necesita (sin refetch)
      const updatedItem = await db.quoteItem.findUniqueOrThrow({
        where:   { id },
        include: {
          elementType:  true,
          components: {
            include: {
              material:     true,
              surfaceFinish:true,
              edges:        { include: { edgeTreatment: true } },
            },
          },
          hardwareItems:{ include: { hardware: true } },
          supplies:     { include: { assemblySupply: true } },
        },
      });

      return {
        item:    updatedItem,
        project: projectTotals.projTotals,
      };
    }),

  deleteQuoteItem: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const item = await db.quoteItem.findUnique({
        where:  { id: input.id },
        select: { projectId: true, layoutGroupId: true, project: { select: { userId: true } } },
      });
      if (item?.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Eliminar item — la cascade en el schema borra componentes y edges automáticamente
      await db.quoteItem.delete({ where: { id: input.id } });

      // Recalcular proyecto y posiciones en paralelo (item ya fue eliminado antes de esto)
      const [projectTotals] = await Promise.all([
        pricingService.recalculateProject(item.projectId),
        item.layoutGroupId
          ? layoutService.recalculateGroupPositions(item.layoutGroupId)
          : Promise.resolve(),
      ]);

      // Retornar totales actualizados para que el cliente no necesite refetch
      return { project: projectTotals };
    }),

  // Endpoint ultra-rápido para actualizar posición 3D desde el drag del visor
  updateItemPosition: protectedProcedure
    .input(z.object({
      id:        z.string().cuid(),
      posX:      z.number(),
      posY:      z.number().optional(),
      posZ:      z.number(),
      rotationY: z.number().optional(),
    }))
    .mutation(({ input }) =>
      db.quoteItem.update({
        where: { id: input.id },
        data:  {
          posX:      input.posX,
          posY:      input.posY,
          posZ:      input.posZ,
          rotationY: input.rotationY,
        },
      })
    ),

  // ── Personalización de componentes ──────────────────────────────────────────

  updateComponent: protectedProcedure
    .input(updateComponentSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. Auth + datos base del componente — un solo fetch con joins
      const component = await db.quoteItemComponent.findUnique({
        where:  { id: input.componentId },
        select: {
          boardAreaM2:  true,
          finishAreaM2: true,
          quantity:     true,
          quoteItemId:  true,
          quoteItem: {
            select: { projectId: true, project: { select: { userId: true } } },
          },
        },
      });
      if (component?.quoteItem.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const { quoteItemId, quoteItem: { projectId } } = component;

      // 2. Precios de material y acabado en paralelo
      const [mat, fin] = await Promise.all([
        input.materialId
          ? db.material.findUnique({ where: { id: input.materialId }, select: { pricePerM2: true } })
          : Promise.resolve(null),
        input.surfaceFinishId
          ? db.surfaceFinish.findUnique({ where: { id: input.surfaceFinishId }, select: { pricePerM2: true } })
          : Promise.resolve(null),
      ]);

      const compUnit  = Number(mat?.pricePerM2 ?? 0) * component.boardAreaM2
                      + Number(fin?.pricePerM2 ?? 0) * component.finishAreaM2;
      const compTotal = compUnit * component.quantity;

      // 3. Una sola transacción: actualiza componente → recalcula item → recalcula proyecto
      //    Dentro de $transaction, Postgres ve todos los writes del mismo tx, lo que
      //    elimina el problema de lecturas inconsistentes y reduce round-trips al mínimo.
      const { itemPrices, projectTotals, updatedComponent } = await db.$transaction(async (tx) => {
        // 3a. Actualizar componente
        const updComp = await tx.quoteItemComponent.update({
          where:   { id: input.componentId },
          data:    {
            materialId:      input.materialId,
            surfaceFinishId: input.surfaceFinishId,
            unitPrice:       new Decimal(compUnit),
            totalPrice:      new Decimal(compTotal),
          },
          include: {
            material:     true,
            surfaceFinish:true,
            edges:        { include: { edgeTreatment: true } },
          },
        });

        // 3b. Recalcular item (lee componentes ya actualizados en esta tx)
        const itemPrices = await pricingService.recalculateQuoteItem(quoteItemId, tx);

        // 3c. Recalcular proyecto (lee items ya actualizados en esta tx)
        const projectTotals = await pricingService.recalculateProject(projectId, tx);

        return { itemPrices, projectTotals, updatedComponent: updComp };
      }, { timeout: 30000 });

      return {
        component:    updatedComponent,
        item:         { id: quoteItemId, ...itemPrices },
        project:      projectTotals,
      };
    }),

  updateEdge: protectedProcedure
    .input(updateEdgeSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. Auth + datos del canto en un solo fetch
      const edge = await db.componentEdge.findUnique({
        where:  { id: input.edgeId },
        select: {
          lengthML:    true,
          componentId: true,
          component: {
            select: {
              quoteItemId: true,
              quoteItem: {
                select: { projectId: true, project: { select: { userId: true } } },
              },
            },
          },
        },
      });
      if (edge?.component.quoteItem.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const { componentId, component: { quoteItemId, quoteItem: { projectId } } } = edge;

      // 2. Precio del tratamiento
      const treatment = await db.edgeTreatment.findUniqueOrThrow({
        where:  { id: input.edgeTreatmentId },
        select: { pricePerML: true },
      });
      const edgeTotalPrice = Number(treatment.pricePerML) * edge.lengthML;

      // 3. Una sola transacción: actualiza canto → recalcula item → recalcula proyecto
      const { itemPrices, projectTotals, updatedEdge } = await db.$transaction(async (tx) => {
        const updEdge = await tx.componentEdge.update({
          where: { id: input.edgeId },
          data:  {
            edgeTreatmentId: input.edgeTreatmentId,
            unitPrice:       treatment.pricePerML,
            totalPrice:      new Decimal(edgeTotalPrice),
          },
          include: { edgeTreatment: true },
        });

        const itemPrices    = await pricingService.recalculateQuoteItem(quoteItemId, tx);
        const projectTotals = await pricingService.recalculateProject(projectId, tx);

        return { itemPrices, projectTotals, updatedEdge: updEdge };
      }, { timeout: 30000 });

      return {
        edge:       { ...updatedEdge, componentId },
        item:       { id: quoteItemId, ...itemPrices },
        project:    projectTotals,
      };
    }),

  // ── Herrajes ────────────────────────────────────────────────────────────────

  upsertHardwareItem: protectedProcedure
    .input(upsertHardwareItemSchema)
    .mutation(async ({ ctx, input }) => {
      // Fetch paralelo: autorización + hardware
      const [quoteItem, hardware] = await Promise.all([
        db.quoteItem.findUnique({
          where:  { id: input.quoteItemId },
          select: { projectId: true, project: { select: { userId: true } } },
        }),
        db.hardware.findUniqueOrThrow({
          where:  { id: input.hardwareId },
          select: { pricePerUnit: true },
        }),
      ]);

      if (quoteItem?.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const totalPrice = Number(hardware.pricePerUnit) * input.quantity;

      // findFirst + create/update: seguro sin necesitar índice único compuesto
      const existing = await db.hardwareItem.findFirst({
        where:  { quoteItemId: input.quoteItemId, hardwareId: input.hardwareId },
        select: { id: true },
      });

      if (existing) {
        await db.hardwareItem.update({
          where: { id: existing.id },
          data:  {
            quantity:   input.quantity,
            unitPrice:  hardware.pricePerUnit,
            totalPrice: new Decimal(totalPrice),
          },
        });
      } else {
        await db.hardwareItem.create({
          data: {
            quoteItemId: input.quoteItemId,
            hardwareId:  input.hardwareId,
            quantity:    input.quantity,
            unitPrice:   hardware.pricePerUnit,
            totalPrice:  new Decimal(totalPrice),
          },
        });
      }

      await pricingService.recalculateQuoteItem(input.quoteItemId);
      await pricingService.recalculateProject(quoteItem.projectId);
    }),

  removeHardwareItem: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const hw = await db.hardwareItem.findUnique({
        where:  { id: input.id },
        select: {
          quoteItemId: true,
          quoteItem: { select: { projectId: true, project: { select: { userId: true } } } },
        },
      });
      if (hw?.quoteItem.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await db.hardwareItem.delete({ where: { id: input.id } });
      await pricingService.recalculateQuoteItem(hw.quoteItemId);
      await pricingService.recalculateProject(hw.quoteItem.projectId);
    }),

  // ── Acabados de obra ─────────────────────────────────────────────────────────

  upsertProjectFinish: protectedProcedure
    .input(z.object({
      projectId: z.string().cuid(),
      finishId:  z.string(),
      areaM2:    z.number().positive(),
      notes:     z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Fetch paralelo: autorización + finish
      const [, finish] = await Promise.all([
        assertProjectOwner(input.projectId, ctx.session.user.id),
        db.finish.findUniqueOrThrow({
          where:  { id: input.finishId },
          select: { pricePerM2: true },
        }),
      ]);

      const totalPrice = Number(finish.pricePerM2) * input.areaM2;
      const data = {
        areaM2:     input.areaM2,
        unitPrice:  finish.pricePerM2,
        totalPrice: new Decimal(totalPrice),
        notes:      input.notes,
      };

      const existing = await db.projectFinish.findFirst({
        where:  { projectId: input.projectId, finishId: input.finishId },
        select: { id: true },
      });

      if (existing) {
        await db.projectFinish.update({ where: { id: existing.id }, data });
      } else {
        await db.projectFinish.create({
          data: { ...data, projectId: input.projectId, finishId: input.finishId },
        });
      }

      await pricingService.recalculateProject(input.projectId);
    }),

  // ── BOM manual ────────────────────────────────────────────────────────────────

  reinstantiateBOM: protectedProcedure
    .input(z.object({ quoteItemId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const item = await db.quoteItem.findUnique({
        where:  { id: input.quoteItemId },
        select: { projectId: true, project: { select: { userId: true } } },
      });
      if (item?.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await bomService.instantiateBOM(input.quoteItemId);
      await pricingService.recalculateProject(item.projectId);
    }),
});