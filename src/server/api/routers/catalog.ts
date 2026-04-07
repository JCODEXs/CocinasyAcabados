import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { ElementCategory, PricingUnit, MaterialCategory, HardwareCategory,QualityTier, SurfaceFinishType, EdgeType, SupplyCategory, ComponentType } from "@prisma/client";
import { db } from "@/server/db";

// Helper para obtener o crear catálogo del usuario
async function getOrCreateCatalog(userId: string) {
  return db.catalog.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export const catalogRouter = createTRPCRouter({

  // ── Catálogo completo de una vez ────────────────────────────────────────────

  getFullCatalog: protectedProcedure.query(async ({ ctx }) => {
    const catalog = await getOrCreateCatalog(ctx.session.user.id);
    return db.catalog.findUniqueOrThrow({
      where: { id: catalog.id },
      include: {
        elementTypes: { include: { componentTemplates: { orderBy: { sortOrder: "asc" } } } },
        materials: { where: { isActive: true }, orderBy: { name: "asc" } },
        hardware: { orderBy: [{ category: "asc" }, { qualityTier: "asc" }] },
        surfaceFinishes: { where: { isActive: true }, orderBy: { name: "asc" } },
        edgeTreatments: { orderBy: { name: "asc" } },
        assemblySupplies: { orderBy: { category: "asc" } },
        finishes: { orderBy: { name: "asc" } },
      },
    });
  }),

  // ── ElementType ─────────────────────────────────────────────────────────────

  upsertElementType: protectedProcedure
    .input(z.object({
      id: z.string().cuid().optional(),
      name: z.string().min(1),
      category: z.nativeEnum(ElementCategory),
      unit: z.nativeEnum(PricingUnit),
      basePrice: z.number().min(0),
      defaultWidth: z.number().positive().optional(),
      defaultHeight: z.number().positive().optional(),
      defaultDepth: z.number().positive().optional(),
      threeJsModel: z.string().min(1),
      allowCustomWidth: z.boolean().default(true),
      allowCustomHeight: z.boolean().default(false),
      allowCustomDepth: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const catalog = await getOrCreateCatalog(ctx.session.user.id);
      const { id, ...data } = input;
      if (id) {
        return db.elementType.update({ where: { id }, data: { ...data, basePrice: data.basePrice } });
      }
      return db.elementType.create({ data: { ...data, catalogId: catalog.id, basePrice: data.basePrice } });
    }),

  // ── ComponentTemplates de un ElementType ────────────────────────────────────

  setComponentTemplates: protectedProcedure
    .input(z.object({
      elementTypeId: z.string().cuid(),
      templates: z.array(z.object({
        id: z.string().cuid().optional(),
        componentType: z.nativeEnum(ComponentType),
        label: z.string().optional(),
        widthFormula: z.string().min(1),
        heightFormula: z.string().min(1),
        depthFormula: z.string().default("D"),
        thicknessMM: z.number().int().positive().default(18),
        quantity: z.number().int().positive().default(1),
        sortOrder: z.number().int().default(0),
        topEdge: z.boolean().default(false),
        bottomEdge: z.boolean().default(false),
        leftEdge: z.boolean().default(false),
        rightEdge: z.boolean().default(false),
        defaultMaterialCategory: z.nativeEnum(MaterialCategory).nullable().optional(),
        defaultSurfaceFinishType: z.nativeEnum(SurfaceFinishType).nullable().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verificar pertenencia al instalador
      const et = await db.elementType.findUniqueOrThrow({
        where: { id: input.elementTypeId },
        include: { catalog: true },
      });
      if (et.catalog.userId !== ctx.session.user.id) throw new Error("Sin acceso.");

      // Reemplazar todos los templates (más simple que upsert individual)
      await db.componentTemplate.deleteMany({ where: { elementTypeId: input.elementTypeId } });
      await db.componentTemplate.createMany({
        data: input.templates.map((t) => ({ ...t, elementTypeId: input.elementTypeId, id: undefined })),
      });
    }),

  // ── Material ─────────────────────────────────────────────────────────────────

  upsertMaterial: protectedProcedure
    .input(z.object({
      id: z.string().cuid().optional(),
      name: z.string().min(1),
      category: z.nativeEnum(MaterialCategory),
      pricePerM2: z.number().min(0),
      thicknessMM: z.number().int().positive().default(18),
      textureUrl: z.string().url().optional(),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      aiDescription: z.string().optional(),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const catalog = await getOrCreateCatalog(ctx.session.user.id);
      const { id, ...data } = input;
      if (id) return db.material.update({ where: { id }, data });
      return db.material.create({ data: { ...data, catalogId: catalog.id } });
    }),

  // ── Hardware ─────────────────────────────────────────────────────────────────

  upsertHardware: protectedProcedure
    .input(z.object({
      id: z.string().cuid().optional(),
      name: z.string().min(1),
      category: z.nativeEnum(HardwareCategory),
      qualityTier: z.nativeEnum(QualityTier),
      brand: z.string().optional(),
      pricePerUnit: z.number().min(0),
      unit: z.string().default("und"),
      description: z.string().optional(),
      imageUrl: z.string().url().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const catalog = await getOrCreateCatalog(ctx.session.user.id);
      const { id, ...data } = input;
      if (id) return db.hardware.update({ where: { id }, data });
      return db.hardware.create({ data: { ...data, catalogId: catalog.id } });
    }),

  // ── SurfaceFinish ────────────────────────────────────────────────────────────

  upsertSurfaceFinish: protectedProcedure
    .input(z.object({
      id: z.string().cuid().optional(),
      name: z.string().min(1),
      type: z.nativeEnum(SurfaceFinishType),
      pricePerM2: z.number().min(0),
      textureUrl: z.string().url().optional(),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      aiDescription: z.string().optional(),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const catalog = await getOrCreateCatalog(ctx.session.user.id);
      const { id, ...data } = input;
      if (id) return db.surfaceFinish.update({ where: { id }, data });
      return db.surfaceFinish.create({ data: { ...data, catalogId: catalog.id } });
    }),

  // ── EdgeTreatment ────────────────────────────────────────────────────────────

  upsertEdgeTreatment: protectedProcedure
    .input(z.object({
      id: z.string().cuid().optional(),
      name: z.string().min(1),
      type: z.nativeEnum(EdgeType),
      pricePerML: z.number().min(0),
      thicknessMM: z.number().int().positive().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const catalog = await getOrCreateCatalog(ctx.session.user.id);
      const { id, ...data } = input;
      if (id) return db.edgeTreatment.update({ where: { id }, data });
      return db.edgeTreatment.create({ data: { ...data, catalogId: catalog.id } });
    }),

  // ── AssemblySupply ───────────────────────────────────────────────────────────

  upsertAssemblySupply: protectedProcedure
    .input(z.object({
      id: z.string().cuid().optional(),
      name: z.string().min(1),
      category: z.nativeEnum(SupplyCategory),
      unit: z.string().min(1),
      pricePerUnit: z.number().min(0),
      autoCalcRule: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const catalog = await getOrCreateCatalog(ctx.session.user.id);
      const { id, ...data } = input;
      if (id) return db.assemblySupply.update({ where: { id }, data });
      return db.assemblySupply.create({ data: { ...data, catalogId: catalog.id } });
    }),

  // ── Bulk price update ────────────────────────────────────────────────────────
  // Subir todos los precios de una categoría en un porcentaje

  bulkUpdatePrices: protectedProcedure
    .input(z.object({
      entity: z.enum(["material", "hardware", "surfaceFinish", "edgeTreatment", "assemblySupply", "finish"]),
      ids: z.array(z.string().cuid()),
      pctChange: z.number().min(-100).max(500), // ej. 15 = +15%
    }))
    .mutation(async ({ ctx, input }) => {
      const catalog = await getOrCreateCatalog(ctx.session.user.id);
      const multiplier = 1 + input.pctChange / 100;

      // Todos los modelos tienen el mismo patrón pero diferentes campos de precio
      const priceField: Record<string, string> = {
        material: "pricePerM2",
        hardware: "pricePerUnit",
        surfaceFinish: "pricePerM2",
        edgeTreatment: "pricePerML",
        assemblySupply: "pricePerUnit",
        finish: "pricePerM2",
      };

      const field = priceField[input.entity]!;
      const model = (db as Record<string, unknown>)[input.entity] as {
        findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
        update: (args: unknown) => Promise<unknown>;
      };

      const items = await model.findMany({
        where: { catalogId: catalog.id, id: { in: input.ids } },
      });

      await db.$transaction(
        items.map((item) =>
          model.update({
            where: { id: item.id as string },
            data: { [field]: Number(item[field]) * multiplier },
          })
        )
      );

      return { updated: items.length };
    }),
});