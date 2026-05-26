import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { ElementCategory, PricingUnit, MaterialCategory, HardwareCategory, QualityTier, SurfaceFinishType, EdgeType, SupplyCategory, ComponentType } from "@prisma/client";
import { db } from "@/server/db";

// Helper para obtener o crear catálogo del usuario
async function getOrCreateCatalog(userId: string) {
  return db.catalog.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

// ── Schemas reutilizables ──────────────────────────────────────────────────────
// Acepta string | null | undefined (Prisma devuelve null para opcionales) y
// normaliza "" / null a undefined para no pisar valores en DB.
const optStr = z
  .string()
  .nullish()
  .transform((v) => (v == null || v === "" ? undefined : v));

const optUrl = z
  .string()
  .url()
  .or(z.literal(""))
  .nullish()
  .transform((v) => (v == null || v === "" ? undefined : v));

const optHexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .or(z.literal(""))
  .nullish()
  .transform((v) => (v == null || v === "" ? undefined : v));

// Verifica que la fila exista en el catálogo del usuario y no sea template.
type OwnedModel = {
  findUnique: (args: { where: { id: string }; select: { catalogId: true; isTemplate: true } }) => Promise<
    { catalogId: string; isTemplate: boolean } | null
  >;
};
async function assertOwnedById(model: OwnedModel, id: string, catalogId: string) {
  const row = await model.findUnique({
    where: { id },
    select: { catalogId: true, isTemplate: true },
  });
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Item no encontrado." });
  if (row.isTemplate || row.catalogId !== catalogId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso a este item." });
  }
}

export const catalogRouter = createTRPCRouter({

  // ── Catálogo completo de una vez ────────────────────────────────────────────
getFullCatalog: protectedProcedure.query(async ({ ctx }) => {
  // Single transaction: find-or-create + fetch all in one roundtrip
  const catalog = await db.catalog.upsert({
    where:  { userId: ctx.session.user.id },
    create: { userId: ctx.session.user.id },
    update: {},
    include: {
      elementTypes: {
        include: { componentTemplates: { orderBy: { sortOrder: "asc" } } },
      },
      materials:        { where: { isActive: true }, orderBy: { name: "asc" } },
      hardware:         { orderBy: [{ category: "asc" }, { qualityTier: "asc" }] },
      surfaceFinishes:  { where: { isActive: true }, orderBy: { name: "asc" } },
      edgeTreatments:  { orderBy: { name: "asc" } },
      assemblySupplies:{ orderBy: { category: "asc" } },
      finishes:        { orderBy: { name: "asc" } },
    },
  });
  return catalog;
}),
  // getFullCatalog: protectedProcedure.query(async ({ ctx }) => {
  //   const catalog = await getOrCreateCatalog(ctx.session.user.id);
  //   return db.catalog.findUniqueOrThrow({
  //     where: { id: catalog.id },
  //     include: {
  //       elementTypes: { include: { componentTemplates: { orderBy: { sortOrder: "asc" } } } },
  //       materials: { where: { isActive: true }, orderBy: { name: "asc" } },
  //       hardware: { orderBy: [{ category: "asc" }, { qualityTier: "asc" }] },
  //       surfaceFinishes: { where: { isActive: true }, orderBy: { name: "asc" } },
  //       edgeTreatments: { orderBy: { name: "asc" } },
  //       assemblySupplies: { orderBy: { category: "asc" } },
  //       finishes: { orderBy: { name: "asc" } },
  //     },
  //   });
  // }),

  // ── ElementType ─────────────────────────────────────────────────────────────

  upsertElementType: protectedProcedure
    .input(z.object({
      id: z.string().optional(),
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
        await assertOwnedById(db.elementType, id, catalog.id);
        return db.elementType.update({ where: { id }, data });
      }
      return db.elementType.create({ data: { ...data, catalogId: catalog.id } });
    }),

  // ── ComponentTemplates de un ElementType ────────────────────────────────────

  setComponentTemplates: protectedProcedure
    .input(z.object({
      elementTypeId: z.string(),
      templates: z.array(z.object({
        id: z.string().optional(),
        componentType: z.nativeEnum(ComponentType),
        label: optStr,
        widthFormula: z.string().min(1),
        heightFormula: z.string().min(1),
        depthFormula: z.string().default("D"),
        thicknessMM: z.number().int().positive().default(18),
        posXFormula: z.string().default("0"),
        posYFormula: z.string().default("H / 2"),
        posZFormula: z.string().default("0"),
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
      const catalog = await getOrCreateCatalog(ctx.session.user.id);
      await assertOwnedById(db.elementType, input.elementTypeId, catalog.id);

      await db.$transaction([
        db.componentTemplate.deleteMany({ where: { elementTypeId: input.elementTypeId } }),
        db.componentTemplate.createMany({
          data: input.templates.map(({ id: _id, ...t }) => ({ ...t, elementTypeId: input.elementTypeId })),
        }),
      ]);
    }),

  // ── Material ─────────────────────────────────────────────────────────────────

  upsertMaterial: protectedProcedure
    .input(z.object({
      id: z.string().optional(),
      name: z.string().min(1),
      category: z.nativeEnum(MaterialCategory),
      pricePerM2: z.number().min(0),
      thicknessMM: z.number().int().positive().default(18),
      textureUrl: optUrl,
      color: optHexColor,
      aiDescription: optStr,
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const catalog = await getOrCreateCatalog(ctx.session.user.id);
      const { id, ...data } = input;
      if (id) {
        await assertOwnedById(db.material, id, catalog.id);
        return db.material.update({ where: { id }, data });
      }
      return db.material.create({ data: { ...data, catalogId: catalog.id } });
    }),

  // ── Hardware ─────────────────────────────────────────────────────────────────

  upsertHardware: protectedProcedure
    .input(z.object({
      id: z.string().optional(),
      name: z.string().min(1),
      category: z.nativeEnum(HardwareCategory),
      qualityTier: z.nativeEnum(QualityTier),
      brand: optStr,
      pricePerUnit: z.number().min(0),
      unit: z.string().default("und"),
      description: optStr,
      imageUrl: optUrl,
    }))
    .mutation(async ({ ctx, input }) => {
      const catalog = await getOrCreateCatalog(ctx.session.user.id);
      const { id, ...data } = input;
      if (id) {
        await assertOwnedById(db.hardware, id, catalog.id);
        return db.hardware.update({ where: { id }, data });
      }
      return db.hardware.create({ data: { ...data, catalogId: catalog.id } });
    }),

  // ── SurfaceFinish ────────────────────────────────────────────────────────────

  upsertSurfaceFinish: protectedProcedure
    .input(z.object({
      id: z.string().optional(),
      name: z.string().min(1),
      type: z.nativeEnum(SurfaceFinishType),
      pricePerM2: z.number().min(0),
      textureUrl: optUrl,
      color: optHexColor,
      aiDescription: optStr,
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const catalog = await getOrCreateCatalog(ctx.session.user.id);
      const { id, ...data } = input;
      if (id) {
        await assertOwnedById(db.surfaceFinish, id, catalog.id);
        return db.surfaceFinish.update({ where: { id }, data });
      }
      return db.surfaceFinish.create({ data: { ...data, catalogId: catalog.id } });
    }),

  // ── EdgeTreatment ────────────────────────────────────────────────────────────

  upsertEdgeTreatment: protectedProcedure
    .input(z.object({
      id: z.string().optional(),
      name: z.string().min(1),
      type: z.nativeEnum(EdgeType),
      pricePerML: z.number().min(0),
      thicknessMM: z.number().int().positive().nullish().transform((v) => v ?? undefined),
      description: optStr,
    }))
    .mutation(async ({ ctx, input }) => {
      const catalog = await getOrCreateCatalog(ctx.session.user.id);
      const { id, ...data } = input;
      if (id) {
        await assertOwnedById(db.edgeTreatment, id, catalog.id);
        return db.edgeTreatment.update({ where: { id }, data });
      }
      return db.edgeTreatment.create({ data: { ...data, catalogId: catalog.id } });
    }),

  // ── AssemblySupply ───────────────────────────────────────────────────────────

  upsertAssemblySupply: protectedProcedure
    .input(z.object({
      id: z.string().optional(),
      name: z.string().min(1),
      category: z.nativeEnum(SupplyCategory),
      unit: z.string().min(1),
      pricePerUnit: z.number().min(0),
      autoCalcRule: optStr,
    }))
    .mutation(async ({ ctx, input }) => {
      const catalog = await getOrCreateCatalog(ctx.session.user.id);
      const { id, ...data } = input;
      if (id) {
        await assertOwnedById(db.assemblySupply, id, catalog.id);
        return db.assemblySupply.update({ where: { id }, data });
      }
      return db.assemblySupply.create({ data: { ...data, catalogId: catalog.id } });
    }),

  // ── Bulk price update ────────────────────────────────────────────────────────
  // Subir todos los precios de una categoría en un porcentaje

  bulkUpdatePrices: protectedProcedure
    .input(z.object({
      entity: z.enum(["material", "hardware", "surfaceFinish", "edgeTreatment", "assemblySupply", "finish"]),
      ids: z.array(z.string()),
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
      const model = db[input.entity] as unknown as {
        findMany: (args: { where: { catalogId: string; id: { in: string[] } } }) => Promise<Array<{ id: string } & Record<string, unknown>>>;
        update: (args: { where: { id: string }; data: Record<string, number> }) => import("@prisma/client").Prisma.PrismaPromise<unknown>;
      };

      const items = await model.findMany({
        where: { catalogId: catalog.id, id: { in: input.ids } },
      });

      await db.$transaction(
        items.map((item) =>
          model.update({
            where: { id: item.id },
            data: { [field]: Number(item[field]) * multiplier },
          }),
        ),
      );

      return { updated: items.length };
    }),

  // ── Finish (acabados de obra) ────────────────────────────────────────────────

  upsertFinish: protectedProcedure
    .input(z.object({
      id:         z.string().optional(),
      name:       z.string().min(1),
      pricePerM2: z.number().min(0),
      unit:       z.string().default("m²"),
    }))
    .mutation(async ({ ctx, input }) => {
      const catalog = await getOrCreateCatalog(ctx.session.user.id);
      const { id, ...data } = input;
    if (id) return db.finish.update({ where: { id }, data });
    return db.finish.create({ data: { ...data, catalogId: catalog.id } });
  }),
});