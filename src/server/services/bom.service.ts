/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { db }      from "@/server/db";
import { Decimal } from "@prisma/client/runtime/library";
import { pricingService } from "./pricing.service";
import { createId } from "@paralleldrive/cuid2"; // pnpm add @paralleldrive/cuid2

// ─── Enums inline — nunca importar de @prisma/client en servicios del servidor
// (evita el problema de output path del generador)

type ComponentType    = "LATERAL" | "FONDO" | "TECHO" | "PISO" | "ENTREPAÑO" |
                        "PUERTA"  | "FRENTE_CAJON" | "CAJA_CAJON" | "MESON"  |
                        "ZOCALO"  | "DIVISION" | "RIEL";

type MaterialCategory = "MADERA_NATURAL" | "MDF_LACADO" | "MELAMINA" | "GRANITO" |
                        "MARMOL" | "CUARZO" | "CERAMICA" | "PANEL_YESO" |
                        "SUPERBOARD" | "OTRO";

type SurfaceFinishType = "LACADO" | "CHAPA_MADERA" | "MELAMINA" | "VINILO_ADHESIVO" |
                         "PINTURA" | "BARNIZ" | "SIN_ACABADO";

type EdgeSide = "TOP" | "BOTTOM" | "LEFT" | "RIGHT";

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface ComponentRow {
  id:              string;
  quoteItemId:     string;
  componentType:   ComponentType;
  label:           string | null;
  widthCm:         number;
  heightCm:        number;
  thicknessMM:     number;
  quantity:        number;
  materialId:      string | null;
  surfaceFinishId: string | null;
  boardAreaM2:     number;
  finishAreaM2:    number;
  unitPrice:       Decimal;
  totalPrice:      Decimal;
}

interface EdgeRow {
  id:              string;
  componentId:     string;
  edgeTreatmentId: string;
  edgeSide:        EdgeSide;
  lengthML:        number;
  unitPrice:       Decimal;
  totalPrice:      Decimal;
}

interface SupplyRow {
  quoteItemId:     string;
  assemblySupplyId: string;
  quantity:        number;
  unitPrice:       Decimal;
  totalPrice:      Decimal;
  notes:           null;
}

// ─── Evaluador de fórmulas ────────────────────────────────────────────────────
// Soporta: "W", "H", "D" y expresiones como "W - 3.6", "H / 2", "W * 0.5"
// Nunca ejecuta código arbitrario — solo reemplaza variables conocidas

function evalFormula(
  formula: string,
  W: number,
  H: number,
  D: number,
  ZO:number,
  T:number,
  IW:number,
  ID:number,
): number {
  // Reemplazar variables — \b asegura que no toca "WIDTH", "DEPTH", etc.
  const expr = formula
    .trim()
    .replace(/\bW\b/g, String(W))
    .replace(/\bH\b/g, String(H))
    .replace(/\bZO\b/g, String(ZO))
    .replace(/\bT\b/g, String(T))
    .replace(/\bIW\b/g, String(IW))
    .replace(/\bID\b/g, String(ID))
    .replace(/\bD\b/g, String(D));

  // Validar que solo contenga caracteres seguros antes de evaluar
  if (!/^[\d\s+\-*/().]+$/.test(expr)) {
    throw new Error(`Fórmula contiene caracteres no permitidos: "${formula}"`);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call
    const result = (Function(`"use strict"; return (${expr})`) as () => unknown)();
    if (typeof result !== "number" || !isFinite(result)) {
      throw new Error(`Resultado no numérico: "${formula}" → ${String(result)}`);
    }
    return Math.max(0, result);
  } catch (err) {
    throw new Error(`Fórmula inválida: "${formula}" — ${String(err)}`);
  }
}

// ─── Cálculo de cantidad de insumos ──────────────────────────────────────────

function calcSupplyQty(
  rule:        string,
  panelCount:  number,
  totalAreaM2: number,
): number {
  if (rule.endsWith("_PER_PANEL")) {
    const n = parseFloat(rule.replace("_PER_PANEL", ""));
    return isNaN(n) ? 1 : Math.ceil(n * panelCount);
  }
  if (rule.endsWith("L_PER_M2") || rule.endsWith("KG_PER_M2")) {
    const n = parseFloat(rule);
    return isNaN(n) ? 1 : Math.round(n * totalAreaM2 * 10) / 10;
  }
  return 1;
}

// ─── Función principal ────────────────────────────────────────────────────────

export async function instantiateBOM(quoteItemId: string): Promise<void> {

  // ── 1. Leer datos necesarios en paralelo ─────────────────────────────────

  const item = await db.quoteItem.findUniqueOrThrow({
    where: { id: quoteItemId },
    include: {
      elementType: {
        include: {
          componentTemplates: { orderBy: { sortOrder: "asc" } },
        },
      },
      project: {
        include: {
          user: {
            include: { catalog: true },
          },
        },
      },
    },
  });

  const catalogId = item.project.user.catalog?.id;
  if (!catalogId) {
    throw new Error(
      `El instalador (userId: ${item.project.userId}) no tiene catálogo configurado.`
    );
  }

  const { width: W, height: H, depth: D } = item;
  // introducir T y ZO a las variables del item 
  const ZO=7;
  const T=1.8
  const IW=W-2*T
  const ID = D-2*T
  const templates = item.elementType.componentTemplates;

  // Fetch paralelo de recursos del catálogo
  const [defaultMaterials, defaultFinishes, defaultEdge, autoSupplies] =
    await Promise.all([
      db.material.findMany({
        where: { catalogId, isActive: true },
        select: { id: true, category: true, pricePerM2: true },
      }),
      db.surfaceFinish.findMany({
        where: { catalogId, isActive: true },
        select: { id: true, type: true, pricePerM2: true },
      }),
      db.edgeTreatment.findFirst({
        where:   { catalogId },
        orderBy: { pricePerML: "asc" },
        select:  { id: true, pricePerML: true },
      }),
      db.assemblySupply.findMany({
        where:  { catalogId, autoCalcRule: { not: null } },
        select: { id: true, pricePerUnit: true, autoCalcRule: true },
      }),
    ]);

  // Helper: encontrar material/acabado por categoría
  function pickMaterial(category: string | null | undefined) {
    if (!category) return defaultMaterials[0] ?? null;
    return (
      defaultMaterials.find(m => m.category === category) ??
      defaultMaterials[0] ??
      null
    );
  }

  function pickFinish(type: string | null | undefined) {
    if (!type) return defaultFinishes[0] ?? null;
    return (
      defaultFinishes.find(f => f.type === type) ??
      defaultFinishes[0] ??
      null
    );
  }

  // ── 2. Calcular todos los datos ANTES de tocar la DB ─────────────────────
  // Pre-generamos los IDs de componentes con cuid2 para poder referenciarlos
  // en los edges sin depender del orden de inserción.

  const componentRows: ComponentRow[] = [];
  const edgeRows:      EdgeRow[]      = [];
  const supplyRows:    SupplyRow[]    = [];

  let totalBoardArea = 0;

  for (const tmpl of templates) {
    const compW = evalFormula(tmpl.widthFormula,      W, H, D,ZO,T,IW,ID);
    const compH = evalFormula(tmpl.heightFormula,     W, H, D,ZO,T,IW,ID);
    // depthFormula tiene @default("D") en el schema — siempre existe
    const compD = evalFormula(tmpl.depthFormula ?? "D", W, H, D,ZO,T,IW,ID);
    let faceWidth: number, faceHeight: number, thicknessCm: number;
switch (tmpl.componentType) {
  case "LATERAL":
    case "DIVISION":
    thicknessCm = compW;
    faceWidth = compD;
    faceHeight = compH;
    break;
  case "TECHO":
  case "PISO":
  case "ENTREPAÑO":
    thicknessCm = compH;
    faceWidth = compW;
    faceHeight = compD;
    break;
  default: // FONDO, PUERTA, ZOCALO, etc.
    thicknessCm = compD;
    faceWidth = compW;
    faceHeight = compH;
    break;
}
const areaM2 = (faceWidth * faceHeight * tmpl.quantity) / 10000;

    // const areaM2 = (compW * compH * tmpl.quantity) / 10_000;
    totalBoardArea += areaM2;

    const mat = pickMaterial(tmpl.defaultMaterialCategory as MaterialCategory | null);
    const fin = pickFinish(tmpl.defaultSurfaceFinishType as SurfaceFinishType | null);

    const boardPrice  = mat ? Number(mat.pricePerM2)  * areaM2 : 0;
    const finishPrice = fin ? Number(fin.pricePerM2)  * areaM2 : 0;
    const unitPrice   = boardPrice + finishPrice;

    // Pre-generar ID del componente para poder enlazar edges
    const componentId = createId();

    componentRows.push({
      id:              componentId,
      quoteItemId,
      componentType:   tmpl.componentType as ComponentType,
      label:           tmpl.label ?? null,
      widthCm:         faceWidth,
      heightCm:        faceHeight,
      thicknessMM:     tmpl.thicknessMM,
      quantity:        tmpl.quantity,
      materialId:      mat?.id ?? null,
      surfaceFinishId: fin?.id ?? null,
      boardAreaM2:     areaM2,
      finishAreaM2:    areaM2,
      unitPrice:       new Decimal(unitPrice),
      totalPrice:      new Decimal(unitPrice * tmpl.quantity),
    });

    // ── Cantos visibles de este componente ──────────────────────────────────
    if (defaultEdge) {
      const edgeDefs: Array<{ side: EdgeSide; len: number; active: boolean }> = [
        { side: "TOP",    len: compW / 100, active: tmpl.topEdge    },
        { side: "BOTTOM", len: compW / 100, active: tmpl.bottomEdge },
        { side: "LEFT",   len: compH / 100, active: tmpl.leftEdge   },
        { side: "RIGHT",  len: compH / 100, active: tmpl.rightEdge  },
      ];

      for (const { side, len, active } of edgeDefs) {
        if (!active || len <= 0) continue;
        edgeRows.push({
          id:              createId(),   // ID estable pre-generado
          componentId,                   // referencia directa, no tempId
          edgeTreatmentId: defaultEdge.id,
          edgeSide:        side,
          lengthML:        len,
          unitPrice:       new Decimal(defaultEdge.pricePerML),
          totalPrice:      new Decimal(Number(defaultEdge.pricePerML) * len),
        });
      }
    }
  }

  // ── Insumos de ensamble automáticos ──────────────────────────────────────
  for (const supply of autoSupplies) {
    if (!supply.autoCalcRule) continue;
    const qty   = calcSupplyQty(supply.autoCalcRule, templates.length, totalBoardArea);
    const total = Number(supply.pricePerUnit) * qty;
    supplyRows.push({
      quoteItemId,
      assemblySupplyId: supply.id,
      quantity:         qty,
      unitPrice:        new Decimal(supply.pricePerUnit),
      totalPrice:       new Decimal(total),
      notes:            null,
    });
  }

  // ── 3. Limpiar + insertar en UNA transacción atómica ─────────────────────
  await db.$transaction(async (tx) => {

    // Limpiar datos anteriores (orden importa: edges antes que components)
    await tx.componentEdge.deleteMany({
      where: { component: { quoteItemId } },
    });
    await tx.quoteItemComponent.deleteMany({ where: { quoteItemId } });
    await tx.hardwareItem.deleteMany({      where: { quoteItemId } });
    await tx.quoteItemSupply.deleteMany({   where: { quoteItemId } });

    // Insertar en batch — IDs pre-generados evitan el problema de orden
    if (componentRows.length > 0) {
      await tx.quoteItemComponent.createMany({ data: componentRows });
    }

    if (edgeRows.length > 0) {
      await tx.componentEdge.createMany({ data: edgeRows });
    }

    if (supplyRows.length > 0) {
      await tx.quoteItemSupply.createMany({ data: supplyRows });
    }
  });

  // ── 4. Recalcular precios (fuera de la transacción para no bloquear) ──────
  await pricingService.recalculateQuoteItem(quoteItemId);
}

export const bomService = { instantiateBOM };