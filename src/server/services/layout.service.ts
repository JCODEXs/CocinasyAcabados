import { db } from "@/server/db";
import { type ConnectionType } from "@prisma/client";

const CORNER_DELTAS: Record<string, number> = {
  CORNER_90R: -90,
  CORNER_90L: 90,
  CORNER_45:  -45,
};

export async function recalculateGroupPositions(groupId: string): Promise<void> {
  const group = await db.layoutGroup.findUniqueOrThrow({
    where: { id: groupId },
    include: { items: { orderBy: { groupOrder: "asc" } } },
  });

  let curX = group.startX;
  let curZ = group.startY; // Y del plano 2D = Z del espacio 3D
  let angleDeg = group.baseAngle;
  const RAD = Math.PI / 180;

  const updates = group.items.map((item) => {
    const rad = angleDeg * RAD;

    // Aplicar gap antes de posicionar este item
    curX += Math.cos(rad) * item.gapBeforeCm;
    curZ += Math.sin(rad) * item.gapBeforeCm;

    const posX = parseFloat(curX.toFixed(4));
    const posZ = parseFloat(curZ.toFixed(4));
    const rotationY = angleDeg;

    // Avanzar cursor por el ancho del item en la dirección actual
    curX += Math.cos(rad) * item.width;
    curZ += Math.sin(rad) * item.width;

    // Aplicar giro para el siguiente item
    const delta = CORNER_DELTAS[item.connectionToNext as string];
    if (delta !== undefined) angleDeg += delta;

    return { id: item.id, posX, posY: item.posY, posZ, rotationY };
  });

  await db.$transaction(
    updates.map((u) =>
      db.quoteItem.update({
        where: { id: u.id },
        data: { posX: u.posX, posY: u.posY, posZ: u.posZ, rotationY: u.rotationY },
      })
    )
  );
}

export const layoutService = { recalculateGroupPositions };