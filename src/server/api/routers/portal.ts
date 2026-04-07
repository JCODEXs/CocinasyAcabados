import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";

// Router público: no requiere autenticación, solo el shareToken
export const portalRouter = createTRPCRouter({

  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const project = await db.project.findUnique({
        where: { shareToken: input.token },
        include: {
          client: { select: { name: true } },
          layoutGroups: {
            include: {
              items: {
                orderBy: { groupOrder: "asc" },
                include: {
                  elementType: { select: { name: true, threeJsModel: true } },
                  components: {
                    include: {
                      material: { select: { name: true, color: true, textureUrl: true, aiDescription: true } },
                      surfaceFinish: { select: { name: true, color: true, textureUrl: true, aiDescription: true } },
                      edges: { include: { edgeTreatment: { select: { name: true, type: true } } } },
                    },
                  },
                  hardwareItems: {
                    include: { hardware: { select: { name: true, category: true, qualityTier: true, imageUrl: true } } },
                  },
                },
              },
            },
          },
          projectFinishes: { include: { finish: { select: { name: true } } } },
        },
      });

      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Cotización no encontrada." });

      // Verificar expiración
      if (project.shareExpiry && project.shareExpiry < new Date()) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Este enlace ha expirado." });
      }

      // No exponer datos internos del instalador
      return {
        id: project.id,
        name: project.name,
        status: project.status,
        clientName: project.client.name,
        roomWidth: project.roomWidth,
        roomLength: project.roomLength,
        roomHeight: project.roomHeight,
        aiRenderUrl: project.aiRenderUrl,
        layoutGroups: project.layoutGroups,
        projectFinishes: project.projectFinishes,
        subtotal: project.subtotal,
        total: project.total,
      };
    }),

  // El cliente envía sus preferencias de materiales por componente
  submitClientPreferences: publicProcedure
    .input(z.object({
      token: z.string(),
      preferences: z.array(z.object({
        componentId: z.string().cuid(),
        materialId: z.string().cuid().optional(),
        surfaceFinishId: z.string().cuid().optional(),
        hardwareIds: z.array(z.string().cuid()).optional(),
        notes: z.string().optional(),
      })),
      clientNotes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const project = await db.project.findUnique({ where: { shareToken: input.token } });
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      if (project.shareExpiry && project.shareExpiry < new Date()) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Guardar preferencias como notas en cada componente
      // (en producción podrías tener un modelo ClientPreference dedicado)
      for (const pref of input.preferences) {
        const noteText = [
          pref.notes,
          pref.materialId ? `Material solicitado: ${pref.materialId}` : null,
          pref.surfaceFinishId ? `Acabado solicitado: ${pref.surfaceFinishId}` : null,
        ].filter(Boolean).join(" | ");

        if (noteText) {
          await db.quoteItemComponent.update({
            where: { id: pref.componentId },
            data: { label: `[CLIENTE] ${noteText}` },
          }).catch(() => null); // ignorar si el componente no existe
        }
      }

      // Cambiar estado del proyecto a REVIEWING
      await db.project.update({
        where: { id: project.id },
        data: {
          status: "REVIEWING",
          notes: input.clientNotes
            ? `${project.notes ?? ""}\n\n[CLIENTE]: ${input.clientNotes}`.trim()
            : project.notes,
        },
      });

      return { ok: true };
    }),
});