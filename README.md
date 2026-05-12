# KitchenQuoter — Cocinas y Acabados

KitchenQuoter is a multi-tenant web application for kitchen installers and finish contractors to design kitchens, generate detailed bills of materials, price every component (boards, edges, hardware, supplies, labor finishes), share interactive quotes with clients through a public portal, and visualize the result in a 3D scene.

The project is built on the T3 Stack (Next.js App Router + tRPC + Prisma + NextAuth + Tailwind) and adds a domain-specific data model and pricing engine for the kitchen / finish-carpentry trade in Spanish-speaking markets.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture overview](#architecture-overview)
- [Domain model](#domain-model)
- [Pricing & layout engine](#pricing--layout-engine)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Available scripts](#available-scripts)
- [Authentication](#authentication)
- [tRPC API surface](#trpc-api-surface)
- [Client portal & sharing](#client-portal--sharing)
- [3D viewer](#3d-viewer)
- [Deployment](#deployment)

---

## Features

- **Per-installer catalog** — every installer (user) owns an isolated catalog of element types, materials, hardware, surface finishes, edge treatments, assembly supplies and on-site finishes.
- **Quote builder** — drag-and-drop layout of cabinets and appliances along walls, islands and peninsulas, with per-item dimensions, components, hardware and supplies.
- **Layout engine** — wall runs, islands, L-shape and U-shape groups with automatic position recalculation based on connection types (`INLINE`, `CORNER_90R/L`, `CORNER_45`, `GAP`, `END`).
- **Component & BOM generation** — when a quote item is added, components (sides, top, bottom, shelves, doors, drawer fronts, etc.) are exploded from configurable templates, dimensioned by formulas (`W`, `H`, `D`), and priced by board area, edge length, hardware count and supply consumption.
- **Pricing engine** — recalculates `unitPrice` / `totalPrice` for each item, edge and component, then rolls up to project subtotal, tax and total.
- **Client portal** — every project gets a unique `shareToken` URL where the client can review the quote, see materials and 3D preview, and approve / reject the proposal.
- **3D viewer** — Three.js scene rendering lower / upper cabinets, islands, appliances and wall panels driven directly by the quote data.
- **Authentication** — email + password (bcrypt) plus Google and Discord OAuth via NextAuth v5, JWT sessions, Prisma adapter for OAuth account storage.

---

## Tech stack

| Layer            | Technology                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| Framework        | [Next.js 15](https://nextjs.org) (App Router, React 19, Turbopack dev)                                |
| Language         | TypeScript 5.8                                                                                        |
| API              | [tRPC 11](https://trpc.io) with React Query 5                                                         |
| Auth             | [NextAuth v5 beta](https://authjs.dev) (Credentials, Google, Discord) + `@auth/prisma-adapter`        |
| ORM              | [Prisma 6](https://prisma.io) on PostgreSQL                                                           |
| Validation       | [Zod 3](https://zod.dev)                                                                              |
| Styling          | [Tailwind CSS 4](https://tailwindcss.com) + shadcn/ui + `class-variance-authority` + `tw-animate-css` |
| UI primitives    | `@base-ui/react`, `@heroicons/react`, `lucide-react`                                                  |
| Drag & drop      | `@dnd-kit/core` + `@dnd-kit/sortable`                                                                 |
| Animation        | `framer-motion`                                                                                       |
| 3D               | [three.js](https://threejs.org) `^0.183`                                                              |
| Env validation   | `@t3-oss/env-nextjs`                                                                                  |
| Password hashing | `bcryptjs`                                                                                            |

---

## Architecture overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         Next.js App Router                       │
│                                                                  │
│  /(auth)        signin · register · error                        │
│  /(dashboard)   dashboard                                        │
│  /projects/[id] quote builder (3D + layout + components)         │
│  /portal/[token] · /share/[token]   client-facing read-only      │
│  /quotes/[installerId]              quote landing                │
│  /api/auth/*    NextAuth handlers                                │
│  /api/trpc/*    tRPC HTTP handler                                │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                          tRPC routers                            │
│  auth · catalog · clients · quotes · layout · portal             │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Domain services                             │
│  bom.service        explode components from templates,           │
│                     calculate areas / supplies / hardware        │
│  pricing.service    recalc item totals → project totals          │
│  layout.service     position items inside a layout group         │
│  registration.service  user signup + bcrypt + seed catalog       │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│              Prisma Client → PostgreSQL                          │
└──────────────────────────────────────────────────────────────────┘
```

---

## Domain model

The Prisma schema (`prisma/schema.prisma`) is organized in clearly separated sections.

### Users & multi-tenancy

- `User` — installer or admin (`Role: INSTALLER | ADMIN`). Owns one `Catalog`, many `Project`s and many `Client`s.
- `Account`, `Session`, `VerificationToken` — NextAuth tables for OAuth providers.
- `Catalog` — one per user, root container for all priceable assets.

### Catalog assets (per installer)

| Model               | Purpose                                                                                                           | Pricing unit                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `ElementType`       | Cabinet types, appliances, panels (e.g. _Mueble Bajo_, _Mesón_)                                                   | `POR_ML` / `POR_M2` / `POR_UNIDAD` |
| `Material`          | Boards: MDF, melamina, granito, cuarzo, etc.                                                                      | `pricePerM2`                       |
| `SurfaceFinish`     | Lacquer, veneer, vinyl, paint, varnish                                                                            | `pricePerM2`                       |
| `EdgeTreatment`     | PVC edge, melamine edge, 45° chamfer, post-formed                                                                 | `pricePerML`                       |
| `Hardware`          | Hinges, drawer slides, handles, levelers (with `QualityTier`)                                                     | `pricePerUnit`                     |
| `AssemblySupply`    | Screws, dowels, glue, anchors with `autoCalcRule` (e.g. `8_PER_PANEL`, `0.15L_PER_M2`)                            | `pricePerUnit`                     |
| `Finish`            | On-site work (stucco, paint, flooring)                                                                            | `pricePerM2`                       |
| `ComponentTemplate` | Construction rules per `ElementType` (one per panel: lateral, top, bottom, shelves…) with formulas like `W - 3.6` | —                                  |

### Projects & quoting

```
Client ─┐
        ├── Project ── LayoutGroup* ── QuoteItem* ── QuoteItemComponent* ── ComponentEdge*
        │                                       ├── HardwareItem*
        │                                       └── QuoteItemSupply*
        └── Project ── ProjectFinish* (on-site work)
```

- `LayoutGroup` (`WALL_RUN`, `ISLAND`, `PENINSULA`, `L_SHAPE`, `U_SHAPE`, `STANDALONE`) groups items along a wall or free-standing run, with a starting `(startX, startY)` and `baseAngle` on the floor plan.
- Each `QuoteItem` declares how it joins the next item via `ConnectionType` (`INLINE`, `CORNER_90R`, `CORNER_90L`, `CORNER_45`, `GAP`, `END`) and an optional `gapBeforeCm`.
- `QuoteItemComponent` is the materialized BOM row: real cm dimensions, `boardAreaM2`, `finishAreaM2`, optional `material` and `surfaceFinish`, plus `ComponentEdge` rows for each visible edge.
- `Project` carries the read-only client share (`shareToken`, `shareExpiry`) and rolled-up `subtotal` / `tax` / `total`.

---

## Pricing & layout engine

Three pure server services drive all heavy logic. They live in `src/server/services/` and are invoked from tRPC mutations.

### `bom.service.ts`

- Reads the `ComponentTemplate` rows for an `ElementType` and explodes them into concrete `QuoteItemComponent` rows for a given `QuoteItem`.
- Evaluates dimension formulas with a tiny safe evaluator: tokens `W`, `H`, `D` are substituted with the item dimensions in cm and the expression is evaluated as basic arithmetic (`W - 3.6`, `H / 2`, `18`, …).
- Supply consumption rules are parsed from strings like `8_PER_PANEL`, `0.15L_PER_M2`, `0.05KG_PER_M2`.
- Computes `boardAreaM2` and `finishAreaM2`, then prices each component as `material.pricePerM2 × area + surfaceFinish.pricePerM2 × area`.
- Adds `ComponentEdge` rows for any side flagged on the template (`topEdge`, `bottomEdge`, `leftEdge`, `rightEdge`) and prices them by `pricePerML`.

### `pricing.service.ts`

- `recalculateQuoteItem(quoteItemId)` — sums components (incl. edges) + hardware + supplies → `unitPrice`, then multiplies by `quantity` → `totalPrice`.
- `recalculateProject(projectId)` — sums all `QuoteItem.totalPrice` + `ProjectFinish.totalPrice` → `subtotal`, applies a configurable `taxRate` (defaults to 0; switch to 0.19 for Colombian IVA), and writes `subtotal`, `tax`, `total`, `updatedAt`.
- All decimals use Prisma's `Decimal` to avoid float drift.

### `layout.service.ts`

- `recalculateGroupPositions(groupId)` walks the items of a `LayoutGroup` in `groupOrder`, advancing a cursor `(curX, curZ)` along the current `angleDeg`.
- For each item it writes `posX`, `posZ`, `rotationY`, then applies the `ConnectionType` of that item to update the angle for the next one (`CORNER_90R = -90°`, `CORNER_90L = +90°`, `CORNER_45 = -45°`).
- Result: a deterministic floor-plan position for every item, ready for the 2D `LayoutCanvas` and the 3D `KitchenScene`.

---

## Project structure

```
kitchenquotter/
├── prisma/
│   ├── schema.prisma          # Full domain model (users, catalog, projects, quotes, layout)
│   ├── migrations/            # Versioned SQL migrations
│   ├── seed.ts                # Catalog seed
│   └── seed2.ts               # Additional seed data
├── public/                    # Static assets
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/            # signin · register · error
│   │   ├── (dashboard)/       # dashboard
│   │   ├── projects/[id]/     # Quote builder workspace
│   │   ├── quotes/[installerId]/
│   │   ├── portal/[token]/    # Client portal
│   │   ├── share/[token]/     # Public shared quote
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/  # NextAuth handlers
│   │   │   └── trpc/[trpc]/         # tRPC HTTP handler
│   │   ├── _components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── auth/                 # SignInPage, RegisterPage
│   │   │   ├── kitchen-viewer/       # Three.js scene + objects + controls
│   │   │   │   ├── KitchenViewer.tsx
│   │   │   │   ├── KitchenScene.ts
│   │   │   │   └── objects/          # LowerCabinet, UpperCabinet, Island, Appliance, WallPanel
│   │   │   └── quote-builder/        # Builder UI (sidebar, canvas, item card, summary…)
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/ui/         # shadcn/ui primitives
│   ├── lib/utils.ts
│   ├── server/
│   │   ├── api/
│   │   │   ├── root.ts        # Combines all routers into appRouter
│   │   │   ├── trpc.ts        # tRPC context, protectedProcedure
│   │   │   └── routers/       # auth · catalog · clients · quotes · layout · portal
│   │   ├── auth/index.ts      # NextAuth configuration
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── helpers/serializeDecimal.ts
│   │   ├── lib/serialize.ts
│   │   └── services/          # bom · pricing · layout · registration
│   ├── styles/globals.css
│   ├── trpc/                  # React + server tRPC clients
│   └── env.js                 # @t3-oss/env-nextjs schema
├── start-database.sh          # Local Postgres via Docker / Podman
├── components.json            # shadcn configuration
├── next.config.js
├── tailwind config (PostCSS)  # Tailwind v4 via @tailwindcss/postcss
├── tsconfig.json
└── package.json
```

---

## Getting started

### Prerequisites

- Node.js 20+ and npm 10+
- PostgreSQL 14+ (the included `start-database.sh` will spin one up via Docker or Podman)
- Optional: Google and/or Discord OAuth apps if you want social login

### Install

```bash
cd kitchenquotter
npm install
```

`postinstall` automatically runs `prisma generate`.

### Configure environment

Create a `.env` file in `kitchenquotter/`:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/kitchenquotter"

# NextAuth
AUTH_SECRET="generate-with: openssl rand -base64 32"

# Discord OAuth (used by env.js validation; required at build time)
AUTH_DISCORD_ID="..."
AUTH_DISCORD_SECRET="..."

# Google OAuth (read directly by src/server/auth/index.ts)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Discord OAuth (read directly by src/server/auth/index.ts)
DISCORD_CLIENT_ID="..."
DISCORD_CLIENT_SECRET="..."
```

> Set `SKIP_ENV_VALIDATION=1` to bypass `@t3-oss/env-nextjs` validation during Docker builds.

### Start the database (local dev)

```bash
./start-database.sh
```

The script reads `DATABASE_URL` from `.env`, picks `docker` or `podman`, and runs a Postgres container named `<dbname>-postgres`. It will offer to generate a random password if you're still using the default `password`.

### Apply schema and seed

```bash
npm run db:push      # or: npm run db:generate (prisma migrate dev)
npx prisma db seed   # runs prisma/seed.ts
```

### Run the dev server

```bash
npm run dev
```

The app is served on `http://localhost:3000` with Turbopack.

---

## Environment variables

Defined and validated in `src/env.js` (`@t3-oss/env-nextjs`):

| Variable              | Required    | Notes                                             |
| --------------------- | ----------- | ------------------------------------------------- |
| `DATABASE_URL`        | yes         | Postgres connection string                        |
| `AUTH_SECRET`         | prod only   | NextAuth JWT secret (`openssl rand -base64 32`)   |
| `AUTH_DISCORD_ID`     | yes (build) | Validated at build time even if unused at runtime |
| `AUTH_DISCORD_SECRET` | yes (build) | idem                                              |
| `NODE_ENV`            | auto        | `development` / `test` / `production`             |

Additional variables consumed directly by `src/server/auth/index.ts` (not validated by `env.js`):

| Variable                                      | Used for               |
| --------------------------------------------- | ---------------------- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`   | Google OAuth provider  |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | Discord OAuth provider |

> Empty strings are treated as `undefined` by the env helper. Use `SKIP_ENV_VALIDATION=1` only for build steps that don't need the values.

---

## Database

Prisma + PostgreSQL. The schema is the single source of truth for the domain model — see `prisma/schema.prisma`.

Common workflows:

```bash
npm run db:generate   # prisma migrate dev (create + apply migration in dev)
npm run db:migrate    # prisma migrate deploy (apply existing migrations in prod)
npm run db:push       # prisma db push (skip migrations, sync schema directly)
npm run db:studio     # open Prisma Studio
npx prisma db seed    # run prisma/seed.ts
```

Migrations live in `prisma/migrations/` and are committed to the repo:

- `20260407034347_init` — initial schema
- `20260411165929_add_password_hash` — credentials provider support

---

## Available scripts

From `package.json`:

| Script                                  | What it does                    |
| --------------------------------------- | ------------------------------- |
| `npm run dev`                           | `next dev --turbo`              |
| `npm run build`                         | `next build`                    |
| `npm run start`                         | `next start`                    |
| `npm run preview`                       | `next build && next start`      |
| `npm run lint` / `lint:fix`             | ESLint (`eslint-config-next`)   |
| `npm run typecheck`                     | `tsc --noEmit`                  |
| `npm run check`                         | `next lint && tsc --noEmit`     |
| `npm run format:check` / `format:write` | Prettier (with Tailwind plugin) |
| `npm run db:*`                          | See [Database](#database)       |

---

## Authentication

`src/server/auth/index.ts` configures NextAuth v5 with three providers:

1. **Credentials** — email + password validated by Zod (`min(8)`), looked up in `User`, hash compared with `bcryptjs`. New users sign up through the `auth` tRPC router (`registration.service.ts` hashes the password and seeds an empty `Catalog`).
2. **Google OAuth** — `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
3. **Discord OAuth** — `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`.

Sessions use the **JWT strategy** (Auth.js v5 always emits a JWE for the Credentials provider, so JWT mode lets `auth()` decode the cookie without a DB session lookup). The `PrismaAdapter` is still wired in to persist `Account` rows for OAuth.

The session callback augments `session.user` with `id`, which is what `protectedProcedure` reads in tRPC:

```ts
declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}
```

Custom auth pages:

- `/auth/signin`
- `/auth/error`
- `/setup` (new-user redirect)

---

## tRPC API surface

Composed in `src/server/api/root.ts`:

```ts
appRouter = {
  auth, // signup, current session helpers
  catalog, // CRUD for ElementType, Material, Hardware, SurfaceFinish,
  // EdgeTreatment, AssemblySupply, Finish, ComponentTemplate
  clients, // CRUD for Client
  quotes, // Project + QuoteItem + QuoteItemComponent + Hardware/Supplies
  // Triggers bom.service and pricing.service on every mutation
  layout, // LayoutGroup CRUD + reorder, calls layout.service
  portal, // Public, token-based read access for end clients
};
```

All authenticated endpoints go through `protectedProcedure` in `src/server/api/trpc.ts`, which throws `UNAUTHORIZED` if `session.user.id` is missing.

The client uses two transports:

- `src/trpc/react.tsx` — React Query + httpBatchLink for client components.
- `src/trpc/server.ts` — Server-side caller for RSC and route handlers.

---

## Client portal & sharing

Each `Project` is created with a unique `shareToken` (cuid) and an optional `shareExpiry`. Two public routes consume it:

- `/portal/[token]` — full client portal: read-only quote + 3D preview + approve/reject actions.
- `/share/[token]` — lightweight shared link.
- `/quotes/[installerId]/[quoteId]` — branded landing page for an installer's quote.

The home page (`src/app/page.tsx`) accepts either a combined code (`installerId-quoteId`) or a raw token and routes the visitor accordingly.

The `portal` tRPC router exposes only the read endpoints required to render these pages, scoped by token rather than by session.

---

## 3D viewer

`src/app/_components/kitchen-viewer/` is a self-contained Three.js scene:

- `KitchenViewer.tsx` — React wrapper that mounts/unmounts the canvas, syncs props with the imperative scene.
- `KitchenScene.ts` — owns the `THREE.Scene`, camera, renderer, lights and orbit controls.
- `objects/` — typed wrappers around `THREE.Group`s for each domain object:
  - `LowerCabinet.ts`, `UpperCabinet.ts` — base/wall cabinets (sized in cm)
  - `Island.ts` — free-standing islands
  - `Appliance.ts` — generic appliance shell
  - `WallPanel.ts` — drywall / superboard panels
  - `KitchenObject.ts` — common base
- `controls/` — UI controls layered over the canvas (camera presets, view toggles).

Each `QuoteItem.elementType.threeJsModel` (e.g. `"LowerCabinet"`, `"UpperCabinet"`) is the discriminator the scene uses to instantiate the correct object class with the item's dimensions and computed position.

---

## Deployment

The app is a standard Next.js 15 App Router project; any Next-compatible host works.

- **Vercel** — set `DATABASE_URL`, `AUTH_SECRET`, `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET`, the OAuth credentials, then deploy. Run `npm run db:migrate` against the production database.
- **Docker / self-hosted** — `npm run build` then `npm run start`. Pass `SKIP_ENV_VALIDATION=1` at build time if your build environment doesn't have access to the OAuth secrets.
- **Database** — any PostgreSQL 14+ instance (Neon, Supabase, RDS, Cloud SQL, self-hosted). Apply migrations with `npm run db:migrate`.

After the first deploy, sign in with Credentials (after registering through `/auth/register`) or via Google / Discord OAuth, and your `Catalog` is auto-seeded by `registration.service.ts` so you can start adding materials, hardware and element types immediately.
