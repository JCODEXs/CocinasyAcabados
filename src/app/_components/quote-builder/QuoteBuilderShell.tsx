"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { type RouterOutputs } from "@/trpc/react";
import { CatalogSidebar } from "./CatalogSidebar";
import { LayoutCanvas } from "./LayoutCanvas";
// import { SummaryPanel } from "./SummaryPanel";
import { useQuoteBuilder } from "./context";
import { ViewColumnsIcon, MapIcon } from "@heroicons/react/24/outline";

type Project = RouterOutputs["quotes"]["getProject"];
type Catalog = RouterOutputs["catalog"]["getFullCatalog"];

type ViewMode = "split" | "canvas"; // split = 3 columnas | canvas = canvas expandido

export function QuoteBuilderShell({
  initialProject,
  initialCatalog,
}: {
  initialProject: Project;
  initialCatalog: Catalog;
}) {
  const { projectId } = useQuoteBuilder();
  const [viewMode, setViewMode] = useState<ViewMode>("split");

  const { data: project } = api.quotes.getProject.useQuery(
    { id: projectId },
    { initialData: initialProject, refetchOnWindowFocus: false }
  );

  if (!project) return null;

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-950">
      {/* ── Topbar ─────────────────────────────────────────────────────── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {project.name}
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            {project.client.name}
          </span>
          <StatusBadge status={project.status} />
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle de vista */}
          <button
            onClick={() => setViewMode(v => v === "split" ? "canvas" : "split")}
            className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            {viewMode === "split"
              ? <><MapIcon className="h-3.5 w-3.5" />Vista plano</>
              : <><ViewColumnsIcon className="h-3.5 w-3.5" />Vista completa</>
            }
          </button>

          <div className="ml-2 border-l border-gray-200 pl-2 text-sm font-medium dark:border-gray-700">
            <span className="text-gray-400 dark:text-gray-500">Total: </span>
            <span className="text-gray-900 dark:text-gray-100">
              ${Number(project.total).toLocaleString("es-CO")}
            </span>
          </div>
        </div>
      </header>

      {/* ── Layout de 3 columnas ────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Col 1: Catálogo */}
        <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <CatalogSidebar catalog={initialCatalog} />
        </aside>

        {/* Col 2: Canvas principal */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <LayoutCanvas project={project} />
        </main>

        {/* Col 3: Panel de resumen */}
        {viewMode === "split" && (
          <aside className="flex w-80 shrink-0 flex-col border-l border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            {/* <SummaryPanel project={project} catalog={initialCatalog} /> */}
          </aside>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT:       "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    SENT:        "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    REVIEWING:   "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    APPROVED:    "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
    IN_PROGRESS: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    COMPLETED:   "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  };
  const labels: Record<string, string> = {
    DRAFT: "Borrador", SENT: "Enviado", REVIEWING: "En revisión",
    APPROVED: "Aprobado", IN_PROGRESS: "En proceso", COMPLETED: "Completado",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.DRAFT}`}>
      {labels[status] ?? status}
    </span>
  );
}