// src/server/api/routers/catalog-import.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  listTemplates,
  getImportedSourceIds,
  importItems,
} from "@/server/services/catalog-import.service";
import { serializeDecimals } from "@/server/lib/serialize";

const ENTITY = z.enum([
  "material",
  "hardware",
  "edgeTreatment",
  "assemblySupply",
  "finish",
  "elementType",
]);

export const catalogImportRouter = createTRPCRouter({

  // Lista todos los items del catálogo global (templates).
  getTemplates: protectedProcedure.query(async () => {
    const data = await listTemplates();
    return serializeDecimals(data) as typeof data;
  }),

  // SourceIds que el usuario ya importó, agrupados por entidad.
  getMyImports: protectedProcedure.query(({ ctx }) =>
    getImportedSourceIds(ctx.session.user.id),
  ),

  // Importa uno o varios items en una sola transacción.
  importBatch: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        entity:   ENTITY,
        sourceId: z.string().min(1),
      })).min(1).max(200),
    }))
    .mutation(({ ctx, input }) =>
      importItems(ctx.session.user.id, input.items),
    ),
});
