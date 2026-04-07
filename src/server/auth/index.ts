/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import Google      from "next-auth/providers/google"
import Discord     from "next-auth/providers/discord"
import bcrypt      from "bcryptjs"
import { z }       from "zod"
import { db }      from "@/server/db"
import { type DefaultSession } from "next-auth"
import type { PrismaClient } from "@prisma/client"

const prismaForAuth = db as unknown as PrismaClient


declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
  }
}

// declare module "next-auth/jwt" {
//   interface JWT {
//     id: string
//   }
// }


// ─── Credentials schema ───────────────────────────────────────────────────────

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
})

// ─── Auth config ──────────────────────────────────────────────────────────────
// NOTE: Credentials provider in Auth.js v5 always produces a JWE (JWT) session
// cookie regardless of the strategy setting. Using strategy:"jwt" so auth()
// decodes it directly from the cookie — no DB session-table lookup needed.
// The PrismaAdapter is still used for OAuth User/Account records.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prismaForAuth),
  session: { strategy: "jwt" },
  providers: [
     // ── Google OAuth ──────────────────────────────────────────────────────────
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // ── Discord OAuth ─────────────────────────────────────────────────────────
    Discord({
      clientId:     process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),

    // ── Credentials (email+password) ───────────────────────────────────────────
    Credentials({
      // ... (tu lógica de authorize está bien)
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        })

        if (!user?.passwordHash) return null

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!valid) return null

        // Retornamos el objeto que alimentará al JWT
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    // 1. JWT: Se ejecuta cuando se crea o actualiza el token
    async jwt({ token, user }) {
      // El objeto 'user' solo viene la primera vez que se inicia sesión
      if (user) {
        // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
        token.id = user.id as string;
      }
      return token;
    },

    // 2. SESSION: Pasa los datos del JWT al objeto session que usas en el cliente/servidor
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },

    // 3. SIGN IN: Simplificado para evitar redundancia
    async signIn({ user, account }) {
      // Si es credentials, el usuario ya fue validado en authorize()
      if (account?.provider === "credentials") return true;

      // Para OAuth, el PrismaAdapter se encarga de crear el usuario si no existe
      return true;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    newUser: "/setup",
  },
});