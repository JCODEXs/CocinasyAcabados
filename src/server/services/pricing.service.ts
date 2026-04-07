import { db } from "@/server/db";
import { Decimal } from "@prisma/client/runtime/library";

async function recalculateQuoteItem(quoteItemId: string): Promise<void> {
  const [components, hardwareItems, supplies] = await Promise.all([
    db.quoteItemComponent.findMany({
      where: { quoteItemId },
      include: { edges: true },
    }),
    db.hardwareItem.findMany({ where: { quoteItemId } }),
    db.quoteItemSupply.findMany({ where: { quoteItemId } }),
  ]);

  const componentTotal = components.reduce((acc, c) => {
    const edgeTotal = c.edges.reduce((s, e) => s + Number(e.totalPrice), 0);
    return acc + Number(c.totalPrice) + edgeTotal;
  }, 0);

  const hardwareTotal = hardwareItems.reduce((acc, h) => acc + Number(h.totalPrice), 0);
  const supplyTotal = supplies.reduce((acc, s) => acc + Number(s.totalPrice), 0);

  const unitPrice = componentTotal + hardwareTotal + supplyTotal;

  const item = await db.quoteItem.findUniqueOrThrow({ where: { id: quoteItemId } });
  const totalPrice = unitPrice * item.quantity;

  await db.quoteItem.update({
    where: { id: quoteItemId },
    data: { unitPrice: new Decimal(unitPrice), totalPrice: new Decimal(totalPrice) },
  });
}

async function recalculateProject(projectId: string): Promise<void> {
  const [items, finishes] = await Promise.all([
    db.quoteItem.findMany({ where: { projectId } }),
    db.projectFinish.findMany({ where: { projectId } }),
  ]);

  const itemsTotal = items.reduce((acc, i) => acc + Number(i.totalPrice), 0);
  const finishesTotal = finishes.reduce((acc, f) => acc + Number(f.totalPrice), 0);
  const subtotal = itemsTotal + finishesTotal;

  const project = await db.project.findUniqueOrThrow({ where: { id: projectId } });
  // tax puede ser un campo configurable en el futuro; por ahora 0 o 19% IVA
  const taxRate = 0; // cambiar a 0.19 cuando se requiera IVA
  const tax = subtotal * taxRate;

  await db.project.update({
    where: { id: projectId },
    data: {
      subtotal: new Decimal(subtotal),
      tax: new Decimal(tax),
      total: new Decimal(subtotal + tax),
      updatedAt: new Date(),
    },
  });
}

export const pricingService = { recalculateQuoteItem, recalculateProject };