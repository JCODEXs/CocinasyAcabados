"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { type RouterOutputs } from "@/trpc/react";
import { useQuoteBuilder } from "./context";
import {
  ChevronDownIcon, ChevronRightIcon, PlusIcon,
  TrashIcon, ShareIcon, DocumentArrowDownIcon,
  CheckCircleIcon, ClockIcon,
} from "@heroicons/react/24/outline";

type Project = RouterOutputs["quotes"]["getProject"];
type Catalog = RouterOutputs["catalog"]["getFullCatalog"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);

// ─── Panel principal ──────────────────────────────────────────────────────────

export function SummaryPanel({ project, catalog }: { project: Project; catalog: Catalog }) {
  const { invalidate } = useQuoteBuilder();
  const [tab, setTab] = useState<"items" | "finishes" | "export">("items");

  const updateStatus = api.quotes.updateProjectStatus.useMutation({ onSuccess: invalidate });

  const canSend = project.status === "DRAFT" && Number(project.total) > 0;

  return (
    <div className="flex h-full flex-col">
      {/* ── Encabezado con totales ────────────────────────────────────── */}
      <div className="border-b border-gray-100 px-4 py-4 dark:border-gray-800">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">Resumen</p>

        <TotalRow label="Subtotal"  value={Number(project.subtotal)} muted />
        <TotalRow label="IVA (0%)"  value={Number(project.tax)}     muted />
        <div className="my-2 border-t border-gray-100 dark:border-gray-800" />
        <TotalRow label="Total"     value={Number(project.total)}   large />
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 border-b border-gray-100 dark:border-gray-800">
        {(["items", "finishes", "export"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-xs transition-colors ${
              tab === t
                ? "border-b-2 border-gray-900 font-medium text-gray-900 dark:border-gray-100 dark:text-gray-100"
                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            {t === "items" ? "Elementos" : t === "finishes" ? "Acabados obra" : "Exportar"}
          </button>
        ))}
      </div>

      {/* ── Contenido del tab ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {tab === "items"    && <ItemsTab    project={project} />}
        {tab === "finishes" && <FinishesTab project={project} catalog={catalog} />}
        {tab === "export"   && <ExportTab   project={project} />}
      </div>

      {/* ── Botón principal de envío ─────────────────────────────────── */}
      <div className="shrink-0 border-t border-gray-100 p-4 dark:border-gray-800">
        {project.status === "DRAFT" && (
          <button
            disabled={!canSend}
            onClick={() => updateStatus.mutate({ id: project.id, status: "SENT" })}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            <ShareIcon className="h-4 w-4" />
            {canSend ? "Enviar al cliente" : "Agrega elementos primero"}
          </button>
        )}
        {project.status === "SENT" && (
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2.5 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <ClockIcon className="h-4 w-4 shrink-0" />
            Esperando respuesta del cliente
          </div>
        )}
        {project.status === "APPROVED" && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2.5 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
            <CheckCircleIcon className="h-4 w-4 shrink-0" />
            Aprobado — listo para producción
          </div>
        )}
        {/* Link de compartir */}
        {["SENT", "REVIEWING", "APPROVED"].includes(project.status) && (
          <ShareLinkRow shareToken={project.shareToken} />
        )}
      </div>
    </div>
  );
}

// ─── Tab: desglose por elemento ───────────────────────────────────────────────

function ItemsTab({ project }: { project: Project }) {
  const allItems = project.layoutGroups.flatMap(g =>
    g.items.map(i => ({ ...i, groupName: g.name }))
  );

  if (allItems.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-gray-400">
        Sin elementos en la cotización
      </div>
    );
  }

  // Agrupar por grupo
  return (
    <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
      {project.layoutGroups.map(group => {
        if (group.items.length === 0) return null;
        const groupTotal = group.items.reduce((s, i) => s + Number(i.totalPrice), 0);

        return (
          <GroupSummaryRow key={group.id} name={group.name} total={groupTotal} items={group.items} />
        );
      })}

      {/* Acabados de obra en el mismo desglose */}
      {project.projectFinishes.length > 0 && (
        <div className="px-4 py-3">
          <p className="mb-2 text-xs font-medium text-gray-500">Acabados de obra</p>
          {project.projectFinishes.map(pf => (
            <div key={pf.id} className="flex justify-between py-1 text-xs">
              <span className="text-gray-600 dark:text-gray-400">
                {pf.finish.name}
                <span className="ml-1 text-gray-400">({pf.areaM2} m²)</span>
              </span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {COP(Number(pf.totalPrice))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GroupSummaryRow({
  name, total, items,
}: {
  name: string;
  total: number;
  items: Project["layoutGroups"][number]["items"];
}) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/40"
      >
        <div className="flex items-center gap-1.5">
          {open
            ? <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400" />
            : <ChevronRightIcon className="h-3.5 w-3.5 text-gray-400" />
          }
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{name}</span>
        </div>
        <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{COP(total)}</span>
      </button>

      {open && (
        <div className="pb-1">
          {items.map(item => (
            <ItemSummaryRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function ItemSummaryRow({ item }: { item: Project["layoutGroups"][number]["items"][number] }) {
  const [open, setOpen] = useState(false);

  const componentTotal = item.components.reduce((s, c) => s + Number(c.totalPrice), 0);
  const hardwareTotal  = item.hardwareItems.reduce((s, h) => s + Number(h.totalPrice), 0);
  const supplyTotal    = item.supplies.reduce((s, x) => s + Number(x.totalPrice), 0);

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-6 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/30"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {item.label ?? item.elementType.name}
          </span>
          {item.quantity > 1 && (
            <span className="text-xs text-gray-400">×{item.quantity}</span>
          )}
        </div>
        <span className="text-xs text-gray-700 dark:text-gray-300">{COP(Number(item.totalPrice))}</span>
      </button>

      {/* Desglose interno del item */}
      {open && (
        <div className="mx-6 mb-2 rounded-md border border-gray-100 bg-gray-50/60 p-2 dark:border-gray-800 dark:bg-gray-800/30">
          {componentTotal > 0 && (
            <SubRow label="Tableros + acabados" value={componentTotal} />
          )}
          {hardwareTotal > 0 && (
            <SubRow label="Herrajes" value={hardwareTotal} />
          )}
          {supplyTotal > 0 && (
            <SubRow label="Insumos ensamble" value={supplyTotal} />
          )}
          <div className="mt-1.5 border-t border-gray-100 pt-1.5 dark:border-gray-700">
            <SubRow label={`Unitario × ${item.quantity}`} value={Number(item.unitPrice)} />
          </div>
        </div>
      )}
    </div>
  );
}

function SubRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between py-0.5 text-xs">
      <span className="text-gray-500 dark:text-gray-500">{label}</span>
      <span className="text-gray-700 dark:text-gray-300">{COP(value)}</span>
    </div>
  );
}

// ─── Tab: acabados de obra ────────────────────────────────────────────────────

function FinishesTab({ project, catalog }: { project: Project; catalog: Catalog }) {
  const { invalidate } = useQuoteBuilder();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ finishId: "", areaM2: "" });

  const upsert = api.quotes.upsertProjectFinish.useMutation({
    onSuccess: () => { setAdding(false); setForm({ finishId: "", areaM2: "" }); invalidate(); },
  });

  const handleAdd = () => {
    const area = parseFloat(form.areaM2);
    if (!form.finishId || isNaN(area) || area <= 0) return;
    upsert.mutate({ projectId: project.id, finishId: form.finishId, areaM2: area });
  };

  return (
    <div className="p-4 space-y-2">
      {project.projectFinishes.length === 0 && !adding && (
        <p className="py-4 text-center text-xs text-gray-400">Sin acabados de obra agregados</p>
      )}

      {project.projectFinishes.map(pf => (
        <FinishRow key={pf.id} pf={pf} projectId={project.id} onSaved={invalidate} />
      ))}

      {adding ? (
        <div className="rounded-md border border-gray-200 p-3 space-y-2 dark:border-gray-700">
          <select
            value={form.finishId}
            onChange={e => setForm(f => ({ ...f, finishId: e.target.value }))}
            className="w-full rounded border border-gray-200 bg-white py-1.5 px-2 text-xs text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <option value="">— Tipo de acabado —</option>
            {catalog.finishes.map(f => (
              <option key={f.id} value={f.id}>
                {f.name} — {COP(Number(f.pricePerM2))}/{f.unit}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="number"
                min={0.1}
                step={0.5}
                placeholder="Área m²"
                value={form.areaM2}
                onChange={e => setForm(f => ({ ...f, areaM2: e.target.value }))}
                className="w-full rounded border border-gray-200 bg-white py-1.5 px-2 text-xs focus:outline-none dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={upsert.isPending || !form.finishId || !form.areaM2}
              className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 dark:bg-gray-100 dark:text-gray-900"
            >
              {upsert.isPending ? "..." : "Agregar"}
            </button>
            <button onClick={() => setAdding(false)} className="text-xs text-gray-400">✕</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Agregar acabado de obra
        </button>
      )}

      {/* Total de acabados */}
      {project.projectFinishes.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
          <TotalRow
            label="Total acabados"
            value={project.projectFinishes.reduce((s, f) => s + Number(f.totalPrice), 0)}
            muted
          />
        </div>
      )}
    </div>
  );
}

function FinishRow({ pf, projectId, onSaved }: {
  pf: Project["projectFinishes"][number];
  projectId: string;
  onSaved: () => void;
}) {
  const { invalidate } = useQuoteBuilder();
  const [editingArea, setEditingArea] = useState(false);
  const [areaVal, setAreaVal] = useState(String(pf.areaM2));

  const { data: catalog } = api.catalog.getFullCatalog.useQuery(undefined, { staleTime: 300_000 });
  const upsert = api.quotes.upsertProjectFinish.useMutation({ onSuccess: () => { setEditingArea(false); onSaved(); } });

  const commitArea = () => {
    const area = parseFloat(areaVal);
    if (!isNaN(area) && area > 0) {
      upsert.mutate({ projectId, finishId: pf.finishId, areaM2: area });
    } else {
      setAreaVal(String(pf.areaM2));
      setEditingArea(false);
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-md border border-gray-100 px-3 py-2 dark:border-gray-800">
      <div className="flex-1 min-w-0">
        <p className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">{pf.finish.name}</p>
        <div className="flex items-center gap-1 mt-0.5">
          {editingArea ? (
            <input
              type="number" autoFocus
              value={areaVal} min={0.1} step={0.5}
              onChange={e => setAreaVal(e.target.value)}
              onBlur={commitArea}
              onKeyDown={e => { if (e.key === "Enter") commitArea(); if (e.key === "Escape") { setEditingArea(false); setAreaVal(String(pf.areaM2)); } }}
              className="w-16 rounded border border-blue-400 text-center text-xs py-0.5 focus:outline-none dark:border-blue-500 dark:bg-gray-800 dark:text-gray-100"
            />
          ) : (
            <button onClick={() => setEditingArea(true)}
              className="text-xs text-gray-400 hover:text-gray-600 underline decoration-dashed"
            >
              {pf.areaM2} m²
            </button>
          )}
          <span className="text-xs text-gray-400">
            · {COP(Number(pf.unitPrice))}/m²
          </span>
        </div>
      </div>
      <span className="shrink-0 text-xs font-medium text-gray-800 dark:text-gray-200">
        {COP(Number(pf.totalPrice))}
      </span>
    </div>
  );
}

// ─── Tab: exportar ────────────────────────────────────────────────────────────

function ExportTab({ project }: { project: Project }) {
  const [genPdf, setGenPdf]       = useState<"idle"|"loading"|"done">("idle");
  const [genRender, setGenRender] = useState<"idle"|"loading"|"done">("idle");

  // Estos se implementarán cuando tengamos el router export.ts
  const handlePdf = async () => {
    setGenPdf("loading");
    // TODO: api.export.generatePdf.mutate({ projectId: project.id })
    await new Promise(r => setTimeout(r, 2000));
    setGenPdf("done");
  };

  const handleRender = async () => {
    setGenRender("loading");
    // TODO: api.export.generateAiRender.mutate({ projectId: project.id })
    await new Promise(r => setTimeout(r, 3000));
    setGenRender("done");
  };

  return (
    <div className="p-4 space-y-3">
      {/* PDF */}
      <ExportCard
        title="Cotización PDF"
        description="Documento formal con desglose de materiales, precios y datos del cliente"
        status={genPdf}
        onAction={handlePdf}
        actionLabel="Generar PDF"
        resultLabel="Descargar PDF"
        resultHref={undefined}
        icon={<DocumentArrowDownIcon className="h-5 w-5" />}
      />

      {/* Render IA */}
      <ExportCard
        title="Render de cocina"
        description={project.referenceImageUrl
          ? "Generará un render basado en la foto del espacio real"
          : "Sube una foto del espacio para un render más preciso"
        }
        status={genRender}
        onAction={handleRender}
        actionLabel="Generar render"
        resultLabel="Ver render"
        resultHref={project.aiRenderUrl ?? undefined}
        icon={<span className="text-base">✦</span>}
        disabled={!project.referenceImageUrl}
        disabledHint="Sube una foto del espacio en la configuración del proyecto"
      />

      {/* Link compartible */}
      <div className="rounded-md border border-gray-100 p-3 dark:border-gray-800">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Portal del cliente
        </p>
        <p className="text-xs text-gray-400 mb-2">
          Enlace donde el cliente puede revisar y personalizar materiales
        </p>
        <ShareLinkRow shareToken={project.shareToken} compact />
      </div>
    </div>
  );
}

function ExportCard({ title, description, status, onAction, actionLabel, resultLabel, resultHref, icon, disabled, disabledHint }: {
  title: string;
  description: string;
  status: "idle" | "loading" | "done";
  onAction: () => void;
  actionLabel: string;
  resultLabel: string;
  resultHref?: string;
  icon: React.ReactNode;
  disabled?: boolean;
  disabledHint?: string;
}) {
  return (
    <div className={`rounded-md border p-3 ${disabled ? "opacity-60" : ""} dark:border-gray-800`}
      style={{ borderColor: "var(--color-border-tertiary)" }}>
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{title}</p>
          <p className="mt-0.5 text-xs text-gray-400">
            {disabled && disabledHint ? disabledHint : description}
          </p>
          <div className="mt-2">
            {status === "idle" && (
              <button
                onClick={onAction}
                disabled={disabled}
                className="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {actionLabel}
              </button>
            )}
            {status === "loading" && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                Generando...
              </div>
            )}
            {status === "done" && (
              resultHref ? (
                
                  href={resultHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                >
                  {resultLabel} →
                </a>
              ) : (
                <span className="text-xs text-green-600 dark:text-green-400">
                  ✓ {resultLabel}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Utilidades compartidas ───────────────────────────────────────────────────

function TotalRow({ label, value, muted, large }: {
  label: string; value: number; muted?: boolean; large?: boolean;
}) {
  return (
    <div className={`flex items-baseline justify-between py-0.5 ${large ? "mt-1" : ""}`}>
      <span className={`${large ? "text-sm font-medium text-gray-900 dark:text-gray-100" : "text-xs text-gray-500 dark:text-gray-400"}`}>
        {label}
      </span>
      <span className={`${large ? "text-base font-semibold text-gray-900 dark:text-gray-100" : "text-xs text-gray-700 dark:text-gray-300"}`}>
        {COP(value)}
      </span>
    </div>
  );
}

function ShareLinkRow({ shareToken, compact }: { shareToken: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/portal/${shareToken}`;

  const copy = () => {
    void navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "mt-2"}`}>
      <input
        readOnly
        value={url}
        className="min-w-0 flex-1 rounded border border-gray-100 bg-gray-50 px-2 py-1 text-xs text-gray-500 focus:outline-none dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-400"
      />
      <button
        onClick={copy}
        className="shrink-0 rounded border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400"
      >
        {copied ? "✓" : "Copiar"}
      </button>
    </div>
  );
}