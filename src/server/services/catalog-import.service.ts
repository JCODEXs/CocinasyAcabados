// src/server/services/catalog-import.service.ts
//
// Copia items del catálogo global (Catalog.isGlobal=true, isTemplate=true)
// al catálogo personal del instalador. Cada copia conserva un `sourceId`
// apuntando al template original para detectar "ya importado" en la UI.

import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";

export const GLOBAL_CATALOG_ID = "global-template-catalog";

export type ImportableEntity =
  | "material"
  | "hardware"
  | "edgeTreatment"
  | "assemblySupply"
  | "finish"
  | "elementType";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getOrCreateUserCatalog(userId: string) {
  return db.catalog.upsert({
    where:  { userId },
    create: { userId },
    update: {},
  });
}

async function getGlobalCatalogOrThrow() {
  const cat = await db.catalog.findUnique({ where: { id: GLOBAL_CATALOG_ID } });
  if (!cat?.isGlobal) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "El catálogo global no está inicializado. Ejecuta `npm run db:seed:global`.",
    });
  }
  return cat;
}

// ─── Listado de templates ────────────────────────────────────────────────────

export async function listTemplates() {
  await getGlobalCatalogOrThrow();
  return db.catalog.findUniqueOrThrow({
    where: { id: GLOBAL_CATALOG_ID },
    include: {
      materials:        { orderBy: { name: "asc" } },
      hardware:         { orderBy: [{ category: "asc" }, { qualityTier: "asc" }] },
      edgeTreatments:   { orderBy: { name: "asc" } },
      assemblySupplies: { orderBy: { category: "asc" } },
      finishes:         { orderBy: { name: "asc" } },
      elementTypes: {
        orderBy: { name: "asc" },
        include: { componentTemplates: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
}

// ─── Sets de sourceIds ya importados por el usuario ──────────────────────────

export async function getImportedSourceIds(userId: string) {
  const catalog = await getOrCreateUserCatalog(userId);
  const where = { catalogId: catalog.id, sourceId: { not: null } } as const;

  const [m, h, e, s, f, et] = await Promise.all([
    db.material.findMany       ({ where, select: { sourceId: true } }),
    db.hardware.findMany       ({ where, select: { sourceId: true } }),
    db.edgeTreatment.findMany  ({ where, select: { sourceId: true } }),
    db.assemblySupply.findMany ({ where, select: { sourceId: true } }),
    db.finish.findMany         ({ where, select: { sourceId: true } }),
    db.elementType.findMany    ({ where, select: { sourceId: true } }),
  ]);

  const ids = (rows: { sourceId: string | null }[]) =>
    rows.map((r) => r.sourceId).filter((x): x is string => x !== null);

  return {
    material:       ids(m),
    hardware:       ids(h),
    edgeTreatment:  ids(e),
    assemblySupply: ids(s),
    finish:         ids(f),
    elementType:    ids(et),
  };
}

// ─── Importación ─────────────────────────────────────────────────────────────

export type ImportInputItem = { entity: ImportableEntity; sourceId: string };
export interface ImportResult { imported: number; skipped: number }

/**
 * Copia los items indicados desde el catálogo global al catálogo del usuario.
 * Si un item con el mismo `sourceId` ya existe en el catálogo del usuario,
 * se omite (no duplica).
 */
export async function importItems(userId: string, items: ImportInputItem[]): Promise<ImportResult> {
  if (items.length === 0) return { imported: 0, skipped: 0 };
  const catalog = await getOrCreateUserCatalog(userId);

  let imported = 0;
  let skipped  = 0;

  await db.$transaction(async (tx) => {
    for (const it of items) {
      const ok = await importOne(tx, catalog.id, it);
      ok ? imported++ : skipped++;
    }
  });

  return { imported, skipped };
}

// ─── Imports individuales por entidad ────────────────────────────────────────

type Tx = Prisma.TransactionClient;

async function importOne(tx: Tx, userCatalogId: string, item: ImportInputItem): Promise<boolean> {
  switch (item.entity) {
    case "material":       return importMaterial      (tx, userCatalogId, item.sourceId);
    case "hardware":       return importHardware      (tx, userCatalogId, item.sourceId);
    case "edgeTreatment":  return importEdgeTreatment (tx, userCatalogId, item.sourceId);
    case "assemblySupply": return importAssemblySupply(tx, userCatalogId, item.sourceId);
    case "finish":         return importFinish        (tx, userCatalogId, item.sourceId);
    case "elementType":    return importElementType   (tx, userCatalogId, item.sourceId);
  }
}

async function importMaterial(tx: Tx, catalogId: string, sourceId: string): Promise<boolean> {
  const src = await tx.material.findFirst({
    where: { id: sourceId, catalogId: GLOBAL_CATALOG_ID, isTemplate: true },
  });
  if (!src) return false;
  const dup = await tx.material.findFirst({ where: { catalogId, sourceId } });
  if (dup) return false;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, catalogId: _c, isTemplate: _t, sourceId: _s, ...rest } = src;
  await tx.material.create({
    data: { ...rest, catalogId, isTemplate: false, sourceId: src.id },
  });
  return true;
}

async function importHardware(tx: Tx, catalogId: string, sourceId: string): Promise<boolean> {
  const src = await tx.hardware.findFirst({
    where: { id: sourceId, catalogId: GLOBAL_CATALOG_ID, isTemplate: true },
  });
  if (!src) return false;
  if (await tx.hardware.findFirst({ where: { catalogId, sourceId } })) return false;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, catalogId: _c, isTemplate: _t, sourceId: _s, ...rest } = src;
  await tx.hardware.create({ data: { ...rest, catalogId, isTemplate: false, sourceId: src.id } });
  return true;
}

async function importEdgeTreatment(tx: Tx, catalogId: string, sourceId: string): Promise<boolean> {
  const src = await tx.edgeTreatment.findFirst({
    where: { id: sourceId, catalogId: GLOBAL_CATALOG_ID, isTemplate: true },
  });
  if (!src) return false;
  if (await tx.edgeTreatment.findFirst({ where: { catalogId, sourceId } })) return false;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, catalogId: _c, isTemplate: _t, sourceId: _s, ...rest } = src;
  await tx.edgeTreatment.create({ data: { ...rest, catalogId, isTemplate: false, sourceId: src.id } });
  return true;
}

async function importAssemblySupply(tx: Tx, catalogId: string, sourceId: string): Promise<boolean> {
  const src = await tx.assemblySupply.findFirst({
    where: { id: sourceId, catalogId: GLOBAL_CATALOG_ID, isTemplate: true },
  });
  if (!src) return false;
  if (await tx.assemblySupply.findFirst({ where: { catalogId, sourceId } })) return false;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, catalogId: _c, isTemplate: _t, sourceId: _s, ...rest } = src;
  await tx.assemblySupply.create({ data: { ...rest, catalogId, isTemplate: false, sourceId: src.id } });
  return true;
}

async function importFinish(tx: Tx, catalogId: string, sourceId: string): Promise<boolean> {
  const src = await tx.finish.findFirst({
    where: { id: sourceId, catalogId: GLOBAL_CATALOG_ID, isTemplate: true },
  });
  if (!src) return false;
  if (await tx.finish.findFirst({ where: { catalogId, sourceId } })) return false;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, catalogId: _c, isTemplate: _t, sourceId: _s, ...rest } = src;
  await tx.finish.create({ data: { ...rest, catalogId, isTemplate: false, sourceId: src.id } });
  return true;
}

async function importElementType(tx: Tx, catalogId: string, sourceId: string): Promise<boolean> {
  const src = await tx.elementType.findFirst({
    where:   { id: sourceId, catalogId: GLOBAL_CATALOG_ID, isTemplate: true },
    include: { componentTemplates: true },
  });
  if (!src) return false;
  if (await tx.elementType.findFirst({ where: { catalogId, sourceId } })) return false;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, catalogId: _c, isTemplate: _t, sourceId: _s, componentTemplates, ...rest } = src;
  const created = await tx.elementType.create({
    data: { ...rest, catalogId, isTemplate: false, sourceId: src.id },
  });

  if (componentTemplates.length > 0) {
    await tx.componentTemplate.createMany({
      data: componentTemplates.map((t) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _ctId, elementTypeId: _etId, ...ctRest } = t;
        return { ...ctRest, elementTypeId: created.id };
      }),
    });
  }
  return true;
}
