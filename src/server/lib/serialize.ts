/* eslint-disable @typescript-eslint/no-explicit-any */
// src/server/lib/serialize.ts

// Convierte recursivamente Prisma.Decimal a number y devuelve objetos planos
// seguros para SuperJSON. No usar for..in (copia props heredadas como
// `constructor`, lo que dispara el guard de prototype pollution de SuperJSON).
// src/server/lib/serialize.ts
export function serializeDecimals(obj: unknown): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "object" && "toNumber" in (obj)) {
    return (obj as { toNumber: () => number }).toNumber();
  }
  if (Array.isArray(obj)) return obj.map(serializeDecimals);
  if (typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(
        ([k, v]) => [k, serializeDecimals(v)]
      )
    );
  }
  return obj;
}