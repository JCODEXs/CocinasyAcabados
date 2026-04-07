
import { z } from "zod"
import { createTRPCRouter, publicProcedure, } from "@/server/api/trpc"
import { RegistrationService } from "@/server/services/registration.service"

export const authRouter = createTRPCRouter({

  /**
   * Registro de nuevo usuario — público, sin autenticación previa.
   */
  register: publicProcedure
    .input(z.object({
      name:             z.string().min(2).max(60),
      email:            z.string().email(),
      password:         z.string().min(8).max(100),
      registrationCode: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return RegistrationService.register(input)
    }),
})