
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { quotesRouter } from "./routers/quotes";
import { catalogRouter } from "./routers/catalog";
import { layoutRouter } from "./routers/layout";
import { portalRouter } from "./routers/portal";
import { authRouter } from "./routers/auth";
import { clientsRouter } from "./routers/clients";


export const appRouter = createTRPCRouter({
  quotes: quotesRouter,
  catalog: catalogRouter,
  layout: layoutRouter,
  portal: portalRouter,
  auth: authRouter,
  clients: clientsRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);