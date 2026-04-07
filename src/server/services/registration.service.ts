import bcrypt from "bcryptjs";
import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RegisterInput {
  name:     string;
  email:    string;
  password: string;
}

export interface RegisterResult {
  userId:  string;
  message: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const RegistrationService = {

  /**
   * Registro simple de usuario.
   */
  async register(input: RegisterInput): Promise<RegisterResult> {

    // 1. Verificar que el email no exista
    const existing = await db.user.findUnique({
      where: { email: input.email },
    });
    
    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Ya existe una cuenta con este email.",
      });
    }

    // 2. Hashear contraseña
    const passwordHash = await bcrypt.hash(input.password, 12);

    // 3. Crear usuario
    // Nota: He eliminado la transacción ya que no hay tablas secundarias que crear
    const user = await db.user.create({
      data: {
        name:         input.name,
        email:        input.email,
        passwordHash,
      },
    });

    return {
      userId:  user.id,
      message: "Cuenta creada exitosamente.",
    };
  },

  /**
   * Actualiza el perfil del usuario.
   */
  async updateAccount(userId: string, input: { name?: string; email?: string }) {
    // Si se intenta cambiar el email, verificar disponibilidad
    if (input.email) {
      const existing = await db.user.findFirst({
        where: { 
          email: input.email, 
          NOT: { id: userId } 
        },
        select: { id: true },
      });
      
      if (existing) {
        throw new TRPCError({ 
          code: "CONFLICT", 
          message: "Este email ya está en uso por otra cuenta." 
        });
      }
    }

    return db.user.update({
      where: { id: userId },
      data: {
        ...(input.name  && { name:  input.name  }),
        ...(input.email && { email: input.email }),
      },
      select: { 
        id: true, 
        name: true, 
        email: true 
      },
    });
  },
};