# KitchenQuoter — Plan de mejoras

Lista accionable derivada del análisis del repositorio. Cada tarea referencia el archivo y, cuando aplica, las líneas afectadas. Prioridades: 🔴 crítico · 🟠 alto · 🟡 medio · 🔵 bajo.

---

## Lote 1 · Quick wins (≈ 1 día)

Cambios mecánicos, sin migraciones, sin nuevas dependencias.

- [ ] 🔴 **Ownership en `clients.update` / `clients.delete`** — `src/server/api/routers/clients.ts:25-42`. Filtrar por `userId: ctx.session.user.id` o crear helper `assertClientOwner`.
- [ ] 🟠 **`layout.createGroup` usa `z.string().default("L")`** — `src/server/api/routers/layout.ts:15`. Reemplazar por `z.nativeEnum(GroupType).default("WALL_RUN")`. Hoy cualquier creación de grupo falla en DB.
- [ ] 🟠 **`getFullCatalog` no hace `await`** — `src/server/api/routers/catalog.ts:24-37`. Añadir `await` y eliminar el import no usado de `serializeDecimals`.
- [ ] 🟠 **`updateQuoteItem` detecta cambio de dimensiones con `??`** — `src/server/api/routers/quotes.ts:211`. Cambiar a comparación explícita `data.width !== undefined || …`.
- [ ] 🟠 **Logs de debug en producción** — eliminar / gatear con `NODE_ENV === "development"`:
  - `src/server/api/routers/catalog.ts:7` (`console.log(ComponentType, …)` a nivel de módulo).
  - `src/server/api/routers/layout.ts:21-22` (`userId desde sesión`, `input recibido`).
  - `src/server/api/trpc.ts:99` (timing log) → mover dentro del bloque `isDev`.
- [ ] 🟡 **Navbar nunca se oculta en páginas de auth** — `src/app/_components/Navbar.tsx:11`. La condición `pathname?.includes("/auth/")` no matchea `/signin`, `/register`, `/error` (route group `(auth)` no aparece en la URL). Ajustar la lista de prefijos.
- [ ] 🟡 **Metadata por defecto de create-t3-app** — `src/app/layout.tsx:10-14`. Cambiar `title` y `description` a KitchenQuoter; `<html lang="es">`.
- [ ] 🟡 **Formato Prettier roto en routers** — correr `npm run format:write` (ver `quotes.ts:190-194`, `:226`, `:245-263`, `:337-379`).
- [ ] 🔵 **Dependencias dudosas** — `package.json`:
  - eliminar `"dnd-kit": "^0.0.2"` (paquete stub, no relacionado con `@dnd-kit/*`).
  - mover `"shadcn"` a `devDependencies` (es CLI).
  - verificar/actualizar `"lucide-react": "^1.8.0"` (versión muy antigua).
- [ ] 🔵 **Limpiar import mal posicionado** — `src/server/api/routers/quotes.ts:81` (import de `db` a mitad de archivo) y coma sobrante en `src/server/api/routers/auth.ts:3`.
- [ ] 🔵 **`RegistrationService.updateAccount` sin router que la exponga** — decidir entre exponerla o eliminarla.

---

## Lote 2 · Correctness crítico (≈ 2-3 días)

Requiere migraciones y/o tests de fixture.

- [ ] 🔴 **Catálogo no se crea al registrar usuario** — `src/server/services/registration.service.ts:40-50` y NextAuth OAuth (`src/server/auth/index.ts`). `bom.service.ts:46-47` exige `catalog.id` y revienta. Crear `Catalog` dentro del mismo `db.$transaction` que `User.create`, y añadir `events.createUser` en NextAuth para flujos OAuth.
- [ ] 🔴 **`bomService.instantiateBOM` no es atómico y mapea cantos por orden de cuid** — `src/server/services/bom.service.ts:62-178`. Reescribir para:
  1. Una sola `db.$transaction(async tx => …)` que cubra delete + create.
  2. Crear cada `quoteItemComponent` con sus `edges` en una sola llamada (`create({ data: { …, edges: { create: [...] } } })`), eliminando los IDs falsos `temp_${idx}` y el `orderBy: { id: "asc" }` que **no garantiza orden de inserción**.
- [ ] 🔴 **`evalFormula` ejecuta `Function(string)` sobre input del instalador** — `src/server/services/bom.service.ts:9-18`. Sustituir por un parser acotado (recursive descent o `mathjs.evaluate` con scope restringido) que solo acepte números, `+ - * / ( )` y los símbolos `W`, `H`, `D`. Añadir validación Zod del formato en `setComponentTemplates`.
- [ ] 🟠 **`bulkUpdatePrices` pierde precisión Decimal** — `src/server/api/routers/catalog.ts:236-240`. Usar `new Prisma.Decimal(item[field]).mul(multiplier)`.
- [ ] 🟠 **`recalculateGroupPositions` no contempla profundidad en esquinas** — `src/server/services/layout.service.ts:21-50`. Revisar geometría para `CORNER_90R/L` y `CORNER_45` con un caso test por cada `ConnectionType`.
- [ ] 🟠 **Migración: índices faltantes** en `prisma/schema.prisma`:
  - `Project @@index([userId]) @@index([userId, status])`
  - `QuoteItem @@index([projectId]) @@index([layoutGroupId]) @@index([elementTypeId])`
  - `QuoteItemComponent @@index([quoteItemId])`
  - `ComponentEdge @@index([componentId])`
  - `LayoutGroup @@index([projectId])`
  - `Client @@index([userId])`
  - `Material / Hardware / SurfaceFinish / EdgeTreatment / AssemblySupply / Finish @@index([catalogId])` y `@@index([catalogId, isActive])` donde aplica.
  - `ComponentTemplate @@index([elementTypeId, sortOrder])`
- [ ] 🟠 **Migración: ampliar `Decimal(10,2)` → `Decimal(14,2)`** en `Project.subtotal/tax/total`, `QuoteItem.unitPrice/totalPrice`, etc. `99M` se queda corto para cocinas premium en COP.
- [ ] 🟡 **`pricingService` con tax hardcodeado a 0** — `src/server/services/pricing.service.ts:45`. Mover a campo configurable (`Project.taxRate` o `Catalog.defaultTaxRate`).
- [ ] 🟡 **`portal.submitClientPreferences` sobreescribe `label` original** — `src/server/api/routers/portal.ts:124-136`. Crear modelo `ClientPreference` y migración asociada.

---

## Lote 3 · Security hardening (≈ 2 días)

- [ ] 🟠 **`portal.submitClientPreferences` no verifica que cada `componentId` pertenezca al proyecto del token** — `src/server/api/routers/portal.ts:124-136`. Filtrar `where: { id, quoteItem: { project: { shareToken: input.token } } }` en lugar de `.catch(() => null)`.
- [ ] 🟠 **`addQuoteItem` no valida que `elementTypeId` pertenezca al catálogo del usuario** — `src/server/api/routers/quotes.ts:166-195`. Permite inyectar templates de otro instalador.
- [ ] 🟠 **`addQuoteItem` no valida que `layoutGroupId` pertenezca al mismo proyecto** — mismo router.
- [ ] 🟠 **OAuth secrets leídos directo de `process.env` con `!`** — `src/server/auth/index.ts:48-57`. Migrar a `env.js` y eliminar las variables muertas `AUTH_DISCORD_ID/SECRET`.
- [ ] 🟠 **Middleware `withProjectOwner(projectId)`** — extraer el patrón `assertProjectOwner` (repetido en `quotes.ts`, `layout.ts`, `catalog.ts`) a un middleware tRPC reutilizable.
- [ ] 🟡 **Rate limiting en `portal.getByToken`** — `src/server/api/routers/portal.ts:9`. Endpoint público con query Prisma de 5 niveles. Añadir `@upstash/ratelimit` o limiter en memoria.
- [ ] 🟡 **`shareToken` no se puede rotar** — añadir mutación `regenerateShareToken` en `quotesRouter`.
- [ ] 🔵 **Sin protección contra brute-force en credentials** — añadir `failedLoginAttempts`, `lockedUntil` en `User`, lógica en `authorize()`.

---

## Lote 4 · Fundamentos (≈ 1 semana)

- [ ] 🔴 **Setup de tests con Vitest** — añadir `vitest`, `@vitest/coverage-v8`, configuración para ESM + path alias. Script `npm run test`.
- [ ] 🔴 **Suite de tests de pricing/BOM/layout**:
  - `bom.service.evalFormula` — aritmética válida, rechazo de input no aritmético, sustitución `W/H/D`.
  - `bom.service.calcSupplyQty` — cada regla (`*_PER_PANEL`, `*L_PER_M2`, `*KG_PER_M2`, fallback).
  - `bom.service.instantiateBOM` — con catálogo fixture, asserts de número correcto de componentes/cantos/insumos y mapeo correcto de cantos a sus componentes.
  - `pricing.service.recalculateProject` — rollup con materiales/finishes/edges mixtos.
  - `layout.service.recalculateGroupPositions` — un test por cada `ConnectionType`.
  - `RegistrationService.register` — duplicate email, hash, creación de Catalog.
- [ ] 🔴 **CI en GitHub Actions** — `.github/workflows/ci.yml` con: install, `npm run check`, `npm run typecheck`, `npm run format:check`, `npm run test`, y `prisma migrate diff` contra `main`.
- [ ] 🟠 **Husky + lint-staged** — pre-commit con `prettier --check` y `eslint --fix` sobre archivos modificados.
- [ ] 🟠 **Servicios reciben `tx` opcional** — refactor de signatures: `instantiateBOM(quoteItemId, tx = db)`, idem `pricing` y `layout`. Permite tests aislados y permite envolver mutaciones router-level en una transacción.
- [ ] 🟠 **Wrap router mutations en transacción** — `addQuoteItem`, `updateQuoteItem`, `deleteQuoteItem`, `updateComponent`, `updateEdge`, `upsertHardwareItem`, `upsertProjectFinish` deben ejecutar todas sus side-effects (BOM + pricing + layout) dentro de un solo `db.$transaction(async tx => …)`.

---

## Lote 5 · Refactors y polish

- [ ] 🟡 **Split `KitchenScene.ts` (733 líneas)** — `src/app/_components/kitchen-viewer/KitchenScene.ts`. Separar en `SceneSetup`, `SelectionController`, `MaterialLoader`, `KitchenScene` (orquestador).
- [ ] 🟡 **Eliminar `serializeDecimals` si superjson lo cubre** — `src/server/lib/serialize.ts`. Verificar que `Decimal` llega al cliente correctamente vía `superjson` y eliminar el helper si es redundante.
- [ ] 🟡 **`updatedAt` en modelos hijos** — añadir a `QuoteItem`, `QuoteItemComponent`, `LayoutGroup`, `Material`, `Hardware`, `Catalog` para auditoría.
- [ ] 🟡 **Logger estructurado** — sustituir `console.log` por `pino`, request id en `createTRPCContext`.
- [ ] 🟡 **Sentry / error tracking** — wrap `errorFormatter` en `src/server/api/trpc.ts:48-58`.
- [ ] 🟡 **Optimistic updates en builder** — `src/app/_components/quote-builder/context.tsx:46-48`. Reemplazar `getProject.invalidate` total por updates dirigidos para drag-reorder.
- [ ] 🟡 **`docker-compose.yml`** — sustituir `start-database.sh` por compose multiplataforma con volumen persistente y Postgres 16 pinned.
- [ ] 🟡 **`engines` en `package.json`** — `{ "node": ">=20.0.0", "npm": ">=10.0.0" }`.
- [ ] 🟡 **`Money` helper** — centralizar `Number(decimal) * qty` (presente en `quotes.ts:289-290, 320, 349, 406, …`).
- [ ] 🟡 **`errors.ts` central** — unificar mensajes (`"Sin acceso."`, `"Cliente no encontrado."`, `"Proyecto no encontrado o sin acceso."`).
- [ ] 🔵 **Aclarar seeds** — `prisma/seed.ts` referencia ids `seed-et-isla` etc. que no existen en ningún otro seed. Renombrar / documentar / añadir el seed base faltante.
- [ ] 🔵 **Reducir `any` y `as any`** — `bom.service.ts:171`, `serialize.ts`, `catalog.ts:225-228`, `auth/index.ts:13`.
- [ ] 🔵 **Casteos `// eslint-disable` en `auth/index.ts`** — revisar si siguen siendo necesarios con Prisma 6 + `@auth/prisma-adapter@2.7`.
- [ ] 🔵 **Corregir README** — ajustar la sección final que afirma que el `Catalog` se auto-seedea en `registration.service.ts` (solo será cierto tras el fix del Lote 2).

---

## Tareas opcionales / roadmap

- [ ] **Modelo `ClientPreference` dedicado** (relacionado con tarea de portal).
- [ ] **Auditoría / changelog por proyecto** (`ProjectAudit` con `userId`, `action`, `payload`, `createdAt`).
- [ ] **Exportar cotización a PDF** (puppeteer / react-pdf).
- [ ] **Dockerfile multi-stage** con `next build --output=standalone` y `prisma migrate deploy` como entrypoint.
- [ ] **i18n** (`next-intl`) para soportar otros mercados además de ES.
- [ ] **Diagrama de flujo "add quote item → BOM → pricing → layout → 3D"** en `/docs`.
