"use client";

import { useState } from "react";
import { type RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";
import { useQuoteBuilder } from "./context";
import { LayoutGroupPanel } from "./LayoutGroupPanel";
import { FloorPlanView } from "./FloorPlanView";
import type { GroupType } from "@prisma/client";
import { PlusIcon, Squares2X2Icon, ListBulletIcon } from "@heroicons/react/24/outline";

type Project = RouterOutputs["quotes"]["getProject"];
type View = "list" | "floorplan";

const GROUP_TYPE_LABELS: Record<string, string> = {
  WALL_RUN: "Pared recta", L_SHAPE: "En L", U_SHAPE: "En U",
  ISLAND: "Isla", PENINSULA: "Península", STANDALONE: "Individual",
};

export function LayoutCanvas({ project }: { project: Project }) {
  const { projectId, invalidate } = useQuoteBuilder();
  const [view, setView] = useState<View>("list");
  const [creatingGroup, setCreatingGroup] = useState(false);

  const createGroup = api.layout.createGroup.useMutation({
    onSuccess: () => { setCreatingGroup(false); invalidate(); },
  });

  const handleCreateGroup = (type: GroupType) => {
    setCreatingGroup(true);
    createGroup.mutate({
      projectId,
      name: GROUP_TYPE_LABELS[type] ?? type,
      type,
    });
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-1 rounded-md border border-gray-200 p-0.5 dark:border-gray-700">
          <ViewToggle active={view === "list"} onClick={() => setView("list")} icon={<ListBulletIcon className="h-4 w-4" />} label="Lista" />
          <ViewToggle active={view === "floorplan"} onClick={() => setView("floorplan")} icon={<Squares2X2Icon className="h-4 w-4" />} label="Plano" />
        </div>

        <AddGroupMenu onSelect={handleCreateGroup} loading={creatingGroup} />
      </div>

      {/* ── Contenido ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {view === "list" ? (
          <div className="space-y-3 p-4">
            {project.layoutGroups.length === 0 ? (
              <EmptyCanvas />
            ) : (
              project.layoutGroups.map(group => (
                <LayoutGroupPanel key={group.id} group={group} />
              ))
            )}
          </div>
        ) : (
          <FloorPlanView project={project} />
        )}
      </div>
    </div>
  );
}

function ViewToggle({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void;
  icon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors ${
        active
          ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      }`}
    >
      {icon}{label}
    </button>
  );
}

function AddGroupMenu({ onSelect, loading }: {
  onSelect: (type: GroupType) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const types = Object.entries(GROUP_TYPE_LABELS) as [GroupType, string][];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        <PlusIcon className="h-3.5 w-3.5" />
        Nuevo grupo
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-md border border-gray-200 bg-white py-1 shadow-md dark:border-gray-700 dark:bg-gray-900">
            {types.map(([type, label]) => (
              <button
                key={type}
                onClick={() => { onSelect(type); setOpen(false); }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyCanvas() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 text-4xl">🪵</div>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Sin elementos todavía</p>
      <p className="mt-1 text-xs text-gray-400">
        Crea un grupo de layout y agrega elementos desde el catálogo
      </p>
    </div>
  );
}