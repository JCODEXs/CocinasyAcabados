"use client";

import { useState } from "react";
import { useQuoteBuilder } from "./context";
import { CatalogSidebar } from "./CatalogSidebar";
import { LayoutCanvas } from "./LayoutCanvas";
import { SummaryPanel } from "./SummaryPanel";
import { KitchenViewer } from "../kitchen-viewer/KitchenViewer";
import {
  ViewColumnsIcon, MapIcon, CubeTransparentIcon,
} from "@heroicons/react/24/outline";

type ViewMode = "split" | "floorplan" | "3d";

export function QuoteBuilderShell() {
  const { project, catalog, isLoadingProject } = useQuoteBuilder();
  const [viewMode, setViewMode] = useState<ViewMode>("split");

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoadingProject || !project || !catalog) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700 dark:border-gray-600 dark:border-t-gray-300" />
          <span className="text-xs text-gray-400">Cargando proyecto...</span>
        </div>
      </div>
    );
  }

  const VIEW_BUTTONS: Array<{ mode: ViewMode; icon: React.ReactNode; label: string }> = [
    {
      mode: "split",
      icon: <ViewColumnsIcon className="h-3.5 w-3.5" />,
      label: "Vista completa",
    },
    {
      mode: "floorplan",
      icon: <MapIcon className="h-3.5 w-3.5" />,
      label: "Plano 2D",
    },
    {
      mode: "3d",
      icon: <CubeTransparentIcon className="h-3.5 w-3.5" />,
      label: "Vista 3D",
    },
  ];

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-950">

      {/* ── Topbar ───────────────────────────────────────────────────────── */}
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
          {/* View mode toggle */}
          <div className="flex items-center gap-0.5 rounded-md border border-gray-200 p-0.5 dark:border-gray-700">
            {VIEW_BUTTONS.map(({ mode, icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors ${
                  viewMode === mode
                    ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          <div className="ml-2 border-l border-gray-200 pl-2 text-sm font-medium dark:border-gray-700">
            <span className="text-gray-400 dark:text-gray-500">Total: </span>
            <span className="text-gray-900 dark:text-gray-100">
              ${Number(project.total).toLocaleString("es-CO")}
            </span>
          </div>
        </div>
      </header>

      {/* ── Vista 3D — ocupa toda la pantalla sin sidebars ───────────────── */}
      {viewMode === "3d" && (
        <div className="flex-1 overflow-hidden">
          <KitchenViewer project={project} className="h-full w-full" />
        </div>
      )}

      {/* ── Vista split o floorplan — layout de columnas ─────────────────── */}
      {viewMode !== "3d" && (
        <div className="flex flex-1 overflow-hidden">

          {/* Col 1: Catálogo — lee del contexto, no necesita props */}
          <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <CatalogSidebar />
          </aside>

          {/* Col 2: Canvas principal */}
          <main className="flex flex-1 flex-col overflow-hidden">
            <LayoutCanvas />
          </main>

          {/* Col 3: Panel de resumen — solo en split */}
          {viewMode === "split" && (
            <aside className="flex w-80 shrink-0 flex-col border-l border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <SummaryPanel />
            </aside>
          )}
        </div>
      )}
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
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles["DRAFT"]}`}>
      {labels[status] ?? status}
    </span>
  );
}