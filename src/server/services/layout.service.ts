import { db } from "@/server/db";
import type { PrismaClient } from "@prisma/client";

// Cliente compatible con $transaction interactivo o con el cliente raíz
type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

const CORNER_DELTAS: Record<string, number> = {
  CORNER_90R: -90,
  CORNER_90L: 90,
  CORNER_45:  -45,
};

const RAD = Math.PI / 180;

export type ItemPosition = {
  id: string;
  posX: number;
  posY: number;
  posZ: number;
  rotationY: number;
};

// ─── Recalcula posiciones y devuelve el array para que el cliente patchee cache ─
async function recalculateGroupPositions(
  groupId: string,
  tx: TxClient = db,
): Promise<ItemPosition[]> {
  const group = await tx.layoutGroup.findUniqueOrThrow({
    where:   { id: groupId },
    include: { items: { orderBy: { groupOrder: "asc" } } },
  });

  let curX = group.startX;
  let curZ = group.startY; // Y del plano 2D = Z del espacio 3D
  let angleDeg = group.baseAngle;

  const updates: ItemPosition[] = group.items.map((item) => {
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

  // Updates secuenciales sobre el mismo tx (Postgres ya está en BEGIN)
  for (const u of updates) {
    await tx.quoteItem.update({
      where: { id: u.id },
      data:  { posX: u.posX, posY: u.posY, posZ: u.posZ, rotationY: u.rotationY },
    });
  }

  return updates;
}

// ─── Calcula el endpoint (X, Z, ángulo) al que llegaría un nuevo item ─────────
//     después del último item de la cadena. Usado por createLTurn para saber
//     dónde colocar el segundo grupo perpendicular.
async function getGroupEndpoint(
  groupId: string,
  tx: TxClient = db,
): Promise<{ x: number; z: number; angle: number }> {
  const group = await tx.layoutGroup.findUniqueOrThrow({
    where:   { id: groupId },
    include: { items: { orderBy: { groupOrder: "asc" } } },
  });

  let curX = group.startX;
  let curZ = group.startY;
  let angleDeg = group.baseAngle;

  for (const item of group.items) {
    const rad = angleDeg * RAD;
    curX += Math.cos(rad) * (item.gapBeforeCm + item.width);
    curZ += Math.sin(rad) * (item.gapBeforeCm + item.width);
    const delta = CORNER_DELTAS[item.connectionToNext as string];
    if (delta !== undefined) angleDeg += delta;
  }

  return { x: curX, z: curZ, angle: angleDeg };
}

export const layoutService = { recalculateGroupPositions, getGroupEndpoint };