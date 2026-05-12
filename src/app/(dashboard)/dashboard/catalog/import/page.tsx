"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CheckIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { api } from "@/trpc/react";
import { serializeDecimals } from "@/server/lib/serialize";
import type { ImportableEntity } from "@/server/services/catalog-import.service";
import { ENTITY_TABS, describeItem, getColor } from "./_meta";

type AnyItem = { id: string; name: string } & Record<string, unknown>;

export default function CatalogImportPage() {
  const [activeTab, setActiveTab] = useState<ImportableEntity>("elementType");
  const [search,    setSearch]    = useState("");
  const [selected,  setSelected]  = useState<Record<ImportableEntity, Set<string>>>(() => ({
    elementType: new Set(), material: new Set(), hardware: new Set(),
    finish: new Set(),     edgeTreatment: new Set(), assemblySupply: new Set(),
  }));
  const [feedback, setFeedback] = useState<string | null>(null);

  const utils = api.useUtils();
  const { data: rawTemplates, isLoading } = api.catalogImport.getTemplates.useQuery();
  const { data: imported }                = api.catalogImport.getMyImports.useQuery();
  const importBatch = api.catalogImport.importBatch.useMutation({
    onSuccess: async (res) => {
      setFeedback(`✓ ${res.imported} importados${res.skipped ? `, ${res.skipped} omitidos` : ""}.`);
      setSelected((prev) => ({ ...prev, [activeTab]: new Set() }));
      await Promise.all([utils.catalogImport.getMyImports.invalidate(), utils.catalog.getFullCatalog.invalidate()]);
    },
    onError: (e) => setFeedback(`Error: ${e.message}`),
  });

  const templates = useMemo(() => serializeDecimals(rawTemplates) as typeof rawTemplates, [rawTemplates]);

  const itemsByEntity: Record<ImportableEntity, AnyItem[]> = useMemo(() => ({
    elementType:    (templates?.elementTypes      ?? []) as unknown as AnyItem[],
    material:       (templates?.materials         ?? []) as unknown as AnyItem[],
    hardware:       (templates?.hardware          ?? []) as unknown as AnyItem[],
    finish:         (templates?.finishes          ?? []) as unknown as AnyItem[],
    edgeTreatment:  (templates?.edgeTreatments    ?? []) as unknown as AnyItem[],
    assemblySupply: (templates?.assemblySupplies  ?? []) as unknown as AnyItem[],
  }), [templates]);

  const importedSet = useMemo<Record<ImportableEntity, Set<string>>>(() => ({
    elementType:    new Set(imported?.elementType    ?? []),
    material:       new Set(imported?.material       ?? []),
    hardware:       new Set(imported?.hardware       ?? []),
    finish:         new Set(imported?.finish         ?? []),
    edgeTreatment:  new Set(imported?.edgeTreatment  ?? []),
    assemblySupply: new Set(imported?.assemblySupply ?? []),
  }), [imported]);

  const currentItems = itemsByEntity[activeTab];
  const filtered = useMemo(() => {
    if (!search.trim()) return currentItems;
    const q = search.toLowerCase();
    return currentItems.filter((it) => it.name.toLowerCase().includes(q));
  }, [currentItems, search]);

  const sel = selected[activeTab];
  const totalSelected = Object.values(selected).reduce((acc, s) => acc + s.size, 0);

  const toggle = (id: string) => {
    if (importedSet[activeTab].has(id)) return;
    setSelected((prev) => {
      const next = new Set(prev[activeTab]);
      next.has(id) ? next.delete(id) : next.add(id);
      return { ...prev, [activeTab]: next };
    });
  };

  const selectAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev[activeTab]);
      for (const it of filtered) if (!importedSet[activeTab].has(it.id)) next.add(it.id);
      return { ...prev, [activeTab]: next };
    });
  };
  const clearTab = () => setSelected((prev) => ({ ...prev, [activeTab]: new Set() }));

  const handleImport = () => {
    const items: { entity: ImportableEntity; sourceId: string }[] = [];
    (Object.keys(selected) as ImportableEntity[]).forEach((e) =>
      selected[e].forEach((id) => items.push({ entity: e, sourceId: id })),
    );
    if (items.length === 0) return;
    setFeedback(null);
    importBatch.mutate({ items });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-28">
      <div className="border-b border-gray-200 bg-white px-8 py-6 dark:border-gray-800 dark:bg-gray-900">
        <Link href="/dashboard/catalog" className="mb-2 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600">
          <ArrowLeftIcon className="h-3.5 w-3.5" /> Volver al catálogo
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Importar del catálogo global</h1>
        <p className="mt-1 text-sm text-gray-500">
          Selecciona los items que quieras agregar a tu catálogo. Se crea una copia en tu cuenta — el original no cambia.
        </p>
      </div>

      <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex overflow-x-auto px-8">
          {ENTITY_TABS.map((t) => {
            const count = itemsByEntity[t.id].length;
            const sCount = selected[t.id].size;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`shrink-0 border-b-2 px-4 py-3 text-sm transition-colors ${
                  activeTab === t.id
                    ? "border-gray-900 font-medium text-gray-900 dark:border-gray-100 dark:text-gray-100"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}>
                {t.label} <span className="ml-1 text-xs text-gray-400">({count})</span>
                {sCount > 0 && <span className="ml-1.5 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{sCount}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre..."
              className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" />
          </div>
          <button onClick={selectAllVisible}
            className="rounded-md border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-white dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800">
            Seleccionar visibles
          </button>
          {sel.size > 0 && (
            <button onClick={clearTab} className="rounded-md px-3 py-2 text-xs text-gray-500 hover:text-gray-700">
              Limpiar selección
            </button>
          )}
        </div>

        {isLoading ? (
          <p className="py-12 text-center text-sm text-gray-400">Cargando catálogo global…</p>
        ) : (
          <ItemList items={filtered} entity={activeTab} importedSet={importedSet[activeTab]} selectedSet={sel} onToggle={toggle} />
        )}
      </div>

      <ImportBar count={totalSelected} feedback={feedback} pending={importBatch.isPending} onImport={handleImport} />
    </div>
  );
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function ItemList({
  items, entity, importedSet, selectedSet, onToggle,
}: {
  items: AnyItem[];
  entity: ImportableEntity;
  importedSet: Set<string>;
  selectedSet: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-900">
        <p className="text-sm text-gray-400">Sin resultados</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {items.map((it) => {
        const isImported = importedSet.has(it.id);
        const isSelected = selectedSet.has(it.id);
        const color = getColor(entity, it);
        return (
          <button key={it.id} onClick={() => onToggle(it.id)} disabled={isImported}
            className={`flex w-full items-center gap-3 border-b border-gray-100 px-5 py-3 text-left transition-colors last:border-0 dark:border-gray-800
              ${isImported ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50 dark:hover:bg-gray-800/30"}
              ${isSelected ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`}>
            <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors
              ${isImported ? "border-green-500 bg-green-500"
                : isSelected ? "border-blue-600 bg-blue-600"
                : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"}`}>
              {(isSelected || isImported) && <CheckIcon className="h-3.5 w-3.5 text-white" />}
            </div>
            {color && <div className="h-6 w-6 shrink-0 rounded border border-gray-200" style={{ background: color }} />}
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{it.name}</p>
              <p className="truncate text-xs text-gray-400">{describeItem(entity, it)}</p>
            </div>
            {isImported && (
              <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-950/40 dark:text-green-400">
                Ya en tu catálogo
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ImportBar({
  count, feedback, pending, onImport,
}: { count: number; feedback: string | null; pending: boolean; onImport: () => void }) {
  if (count === 0 && !feedback) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white px-8 py-3 shadow-lg dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="text-sm">
          {count > 0 && <span className="font-medium text-gray-800 dark:text-gray-200">{count} item{count !== 1 ? "s" : ""} seleccionado{count !== 1 ? "s" : ""}</span>}
          {feedback && <span className={`ml-3 text-xs ${feedback.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>{feedback}</span>}
        </div>
        <button onClick={onImport} disabled={count === 0 || pending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {pending ? "Importando..." : `Importar ${count > 0 ? count : ""}`.trim()}
        </button>
      </div>
    </div>
  );
}
