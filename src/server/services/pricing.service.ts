import { db } from "@/server/db";
import { Decimal } from "@prisma/client/runtime/library";
import type { PrismaClient } from "@prisma/client";

// Tipo compatible con PrismaClient y con el cliente de $transaction interactivo
type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

// ─── Retorna los precios calculados; actualiza el QuoteItem en la BD ──────────
async function recalculateQuoteItem(
  quoteItemId: string,
  tx: TxClient = db,
): Promise<{ unitPrice: number; totalPrice: number }> {
  const [components, hardwareItems, supplies] = await Promise.all([
    tx.quoteItemComponent.findMany({ where: { quoteItemId }, include: { edges: true } }),
    tx.hardwareItem.findMany({ where: { quoteItemId } }),
    tx.quoteItemSupply.findMany({ where: { quoteItemId } }),
  ]);

  const componentTotal = components.reduce((acc, c) => {
    const edgeTotal = c.edges.reduce((s, e) => s + Number(e.totalPrice), 0);
    return acc + Number(c.totalPrice) + edgeTotal;
  }, 0);

  const hardwareTotal = hardwareItems.reduce((acc, h) => acc + Number(h.totalPrice), 0);
  const supplyTotal   = supplies.reduce((acc, s)       => acc + Number(s.totalPrice), 0);

  const unitPrice = componentTotal + hardwareTotal + supplyTotal;

  const item = await tx.quoteItem.findUniqueOrThrow({
    where:  { id: quoteItemId },
    select: { quantity: true },
  });
  const totalPrice = unitPrice * item.quantity;

  await tx.quoteItem.update({
    where: { id: quoteItemId },
    data:  { unitPrice: new Decimal(unitPrice), totalPrice: new Decimal(totalPrice) },
  });

  return { unitPrice, totalPrice };
}

// ─── Retorna los totales calculados; actualiza el Project en la BD ────────────
async function recalculateProject(
  projectId: string,
  tx: TxClient = db,
): Promise<{ subtotal: number; tax: number; total: number }> {
  const [items, finishes] = await Promise.all([
    tx.quoteItem.findMany({ where: { projectId }, select: { totalPrice: true } }),
    tx.projectFinish.findMany({ where: { projectId }, select: { totalPrice: true } }),
  ]);

  const subtotal = [
    ...items.map(i => Number(i.totalPrice)),
    ...finishes.map(f => Number(f.totalPrice)),
  ].reduce((acc, v) => acc + v, 0);

  // taxRate configurable en el futuro (IVA 19% → 0.19)
  const taxRate = 0;
  const tax     = subtotal * taxRate;
  const total   = subtotal + tax;

  await tx.project.update({
    where: { id: projectId },
    data:  {
      subtotal:   new Decimal(subtotal),
      tax:        new Decimal(tax),
      total:      new Decimal(total),
      updatedAt:  new Date(),
    },
  });

  return { subtotal, tax, total };
}

export const pricingService = { recalculateQuoteItem, recalculateProject };