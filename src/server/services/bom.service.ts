import { db } from "@/server/db";
import { type ComponentType, type MaterialCategory, type SurfaceFinishType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { pricingService } from "./pricing.service";

// ─── Evaluador de fórmulas dimensionales ─────────────────────────────────────
// Soporta: "W", "H", "D", "W - 3.6", "H / 2", "18" (fijo mm→cm automático)

function evalFormula(formula: string, W: number, H: number, D: number): number {
  const clean = formula.trim().replace(/\bW\b/g, String(W)).replace(/\bH\b/g, String(H)).replace(/\bD\b/g, String(D));
  try {
    // eval acotado: solo operaciones aritméticas básicas
    const result = Function(`"use strict"; return (${clean})`)() as number;
    return Math.max(0, result);
  } catch {
    throw new Error(`Fórmula inválida: "${formula}"`);
  }
}

// ─── Reglas de cálculo de insumos ────────────────────────────────────────────

function calcSupplyQty(rule: string, panelCount: number, totalAreaM2: number): number {
  if (rule.endsWith("_PER_PANEL")) {
    const n = parseFloat(rule.replace("_PER_PANEL", ""));
    return Math.ceil(n * panelCount);
  }
  if (rule.endsWith("L_PER_M2") || rule.endsWith("KG_PER_M2")) {
    const n = parseFloat(rule);
    return Math.ceil(n * totalAreaM2 * 10) / 10;
  }
  return 1;
}

// ─── Función principal: instanciar BOM completo para un QuoteItem ─────────────

export async function instantiateBOM(quoteItemId: string): Promise<void> {
  const item = await db.quoteItem.findUniqueOrThrow({
    where: { id: quoteItemId },
    include: {
      elementType: { include: { componentTemplates: { orderBy: { sortOrder: "asc" } } } },
      project: { include: { user: { include: { catalog: true } } } },
    },
  });

  const { width: W, height: H, depth: D } = item;
  const catalogId = item.project.user.catalog?.id;
  if (!catalogId) throw new Error("El instalador no tiene catálogo configurado.");

  const [defaultMaterials, defaultFinishes, defaultEdge, supplies] = await Promise.all([
    db.material.findMany({ where: { catalogId, isActive: true } }),
    db.surfaceFinish.findMany({ where: { catalogId, isActive: true } }),
    db.edgeTreatment.findFirst({ where: { catalogId }, orderBy: { pricePerML: "asc" } }),
    db.assemblySupply.findMany({ where: { catalogId, autoCalcRule: { not: null } } }),
  ]);

  function pickDefault<T extends { category: string }>(list: T[], category: string | null | undefined): T | undefined {
    if (!category) return list[0];
    return list.find((x) => x.category === category) ?? list[0];
  }

  // Limpiar en una transacción
  await db.$transaction([
    db.componentEdge.deleteMany({ where: { component: { quoteItemId } } }),
    db.quoteItemComponent.deleteMany({ where: { quoteItemId } }),
    db.hardwareItem.deleteMany({ where: { quoteItemId } }),
    db.quoteItemSupply.deleteMany({ where: { quoteItemId } }),
  ]);

  const templates = item.elementType.componentTemplates;
  let totalBoardArea = 0;

  // ── Acumular datos para batch inserts ─────────────────────────────────────
  const componentsData: Parameters<typeof db.quoteItemComponent.createMany>[0]["data"] = [];
  const edgesData: Parameters<typeof db.componentEdge.createMany>[0]["data"] = [];
  const suppliesData: Parameters<typeof db.quoteItemSupply.createMany>[0]["data"] = [];

  for (let componentIdx = 0; componentIdx < templates.length; componentIdx++) {
    const tmpl = templates[componentIdx];
    const compW = evalFormula(tmpl.widthFormula, W, H, D);
    const compH = evalFormula(tmpl.heightFormula, W, H, D);
    const compD = evalFormula(tmpl.depthFormula ?? "D", W, H, D);

    const areaM2 = (compW * compH * tmpl.quantity) / 10_000;
    totalBoardArea += areaM2;

    const mat = pickDefault(defaultMaterials, tmpl.defaultMaterialCategory as MaterialCategory);
    const fin = pickDefault(defaultFinishes, tmpl.defaultSurfaceFinishType as SurfaceFinishType);

    const boardPrice = mat ? Number(mat.pricePerM2) * areaM2 : 0;
    const finishPrice = fin ? Number(fin.pricePerM2) * areaM2 : 0;
    const unitPrice = boardPrice + finishPrice;

    componentsData.push({
      quoteItemId,
      componentType: tmpl.componentType as ComponentType,
      label: tmpl.label,
      widthCm: compW,
      heightCm: compH,
      thicknessMM: tmpl.thicknessMM,
      quantity: tmpl.quantity,
      materialId: mat?.id ?? null,
      surfaceFinishId: fin?.id ?? null,
      boardAreaM2: areaM2,
      finishAreaM2: areaM2,
      unitPrice: new Decimal(unitPrice),
      totalPrice: new Decimal(unitPrice * tmpl.quantity),
    });

    // ── Acumular datos de cantos ───────────────────────────────────────────
    if (defaultEdge) {
      const edgeSides: Array<{ side: "TOP" | "BOTTOM" | "LEFT" | "RIGHT"; len: number; active: boolean }> = [
        { side: "TOP", len: compW / 100, active: tmpl.topEdge },
        { side: "BOTTOM", len: compW / 100, active: tmpl.bottomEdge },
        { side: "LEFT", len: compH / 100, active: tmpl.leftEdge },
        { side: "RIGHT", len: compH / 100, active: tmpl.rightEdge },
      ];

      for (const { side, len, active } of edgeSides) {
        if (!active) continue;
        const edgePrice = Number(defaultEdge.pricePerML) * len;
        edgesData.push({
          componentId: `temp_${componentIdx}`,
          edgeTreatmentId: defaultEdge.id,
          edgeSide: side,
          lengthML: len,
          unitPrice: new Decimal(defaultEdge.pricePerML),
          totalPrice: new Decimal(edgePrice),
        });
      }
    }
  }

  // ── Acumular datos de insumos ──────────────────────────────────────────
  for (const supply of supplies) {
    if (!supply.autoCalcRule) continue;
    const qty = calcSupplyQty(supply.autoCalcRule, templates.length, totalBoardArea);
    const total = Number(supply.pricePerUnit) * qty;
    suppliesData.push({
      quoteItemId,
      assemblySupplyId: supply.id,
      quantity: qty,
      unitPrice: new Decimal(supply.pricePerUnit),
      totalPrice: new Decimal(total),
    });
  }

  // ── Ejecutar TODAS las inserciones en UNA transacción ────────────────────
  await db.$transaction(async (tx) => {
    // 1. Crear todos los componentes
    if (componentsData.length > 0) {
      await tx.quoteItemComponent.createMany({ data: componentsData });
    }

    // 2. Obtener IDs de componentes recién creados (en orden)
    const createdComponents = await tx.quoteItemComponent.findMany({
      where: { quoteItemId },
      orderBy: { id: "asc" },
      select: { id: true },
    });

    // 3. Mapear edges con los componentes reales
    const realEdgesData = edgesData.map((edge) => {
      const componentIdx = parseInt(edge.componentId.split("_")[1]);
      return {
        ...edge,
        componentId: createdComponents[componentIdx]?.id ?? "",
      };
    }).filter(e => e.componentId);

    if (realEdgesData.length > 0) {
      await tx.componentEdge.createMany({ data: realEdgesData as any });
    }

    // 4. Crear insumos
    if (suppliesData.length > 0) {
      await tx.quoteItemSupply.createMany({ data: suppliesData });
    }
  });

  // ── Recalcular precios del QuoteItem
  await pricingService.recalculateQuoteItem(quoteItemId);
}

export const bomService = { instantiateBOM };