// server/lib/serialize.ts
import { Decimal } from "@prisma/client/runtime/library";

export function serializeDecimals<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  
  // Si es Decimal, convertirlo a number
  if (obj instanceof Decimal) {
    return obj.toNumber() as T;
  }
  
  // Si es array, serializar cada elemento
  if (Array.isArray(obj)) {
    return obj.map(item => serializeDecimals(item)) as T;
  }
  
  // Si es objeto, serializar cada propiedad
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = serializeDecimals(obj[key]);
      }
    }
    return result;
  }
  
  // Primitivos (string, number, boolean, etc.)
  return obj;
}