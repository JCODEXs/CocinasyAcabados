"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";
import { KitchenViewer } from "@/app/_components/kitchen-viewer/KitchenViewer";
import { QuoteBuilderProvider } from "@/app/_components/quote-builder/context";

type PortalProject = RouterOutputs["portal"]["getByToken"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", minimumFractionDigits: 0,
  }).format(n);

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  DRAFT:       { label: "Borrador",      color: "#888" },
  SENT:        { label: "Enviada",       color: "#3b7fd4" },
  REVIEWING:   { label: "En revisión",   color: "#c08020" },
  APPROVED:    { label: "Aprobada",      color: "#2a7a4a" },
  REJECTED:    { label: "Rechazada",     color: "#c03030" },
  IN_PROGRESS: { label: "En proceso",    color: "#6040b0" },
  COMPLETED:   { label: "Completada",    color: "#2a7a6a" },
};

// ─── Main component ───────────────────────────────────────────────────────────

export function PortalClient({
  project: initialProject,
  token,
}: {
  project: PortalProject;
  token: string;
}) {
  const [view, setView] = useState<"overview" | "3d" | "details" | "customize">("overview");
  const [submitted, setSubmitted] = useState(false);

  const { data: project = initialProject } = api.portal.getByToken.useQuery(
    { token },
    { initialData: initialProject, refetchInterval: false }
  );

  const statusInfo = STATUS_INFO[project.status] ?? STATUS_INFO["SENT"];
  const allItems   = project.layoutGroups.flatMap(g => g.items);

  return (
    <div style={{ fontFamily: "'Georgia', 'Times New Roman', serif", minHeight: "100vh", background: "#faf8f5", color: "#1a1a18" }}>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(250,248,245,0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
        padding: "0 2rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 56,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, fontFamily: "system-ui", letterSpacing: "0.12em", fontWeight: 500, color: "#888" }}>
            COCINAS PRO
          </span>
          <span style={{ color: "#ccc" }}>·</span>
          <span style={{ fontSize: 14, fontFamily: "system-ui", color: "#444" }}>{project.name}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 11, fontFamily: "system-ui", letterSpacing: "0.06em",
            background: statusInfo?.color + "18",
            color: statusInfo?.color,
            border: `1px solid ${statusInfo?.color}40`,
            padding: "3px 10px", borderRadius: 20,
          }}>
            {statusInfo?.label}
          </span>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div style={{
        padding: "4rem 2rem 3rem",
        maxWidth: 900, margin: "0 auto",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
      }}>
        <p style={{ fontFamily: "system-ui", fontSize: 12, letterSpacing: "0.15em", color: "#aaa", marginBottom: 12 }}>
          COTIZACIÓN PERSONALIZADA
        </p>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 400, lineHeight: 1.15, marginBottom: 8 }}>
          {project.name}
        </h1>
        <p style={{ fontFamily: "system-ui", fontSize: 15, color: "#666", marginBottom: 32 }}>
          Preparado especialmente para {project.clientName}
        </p>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 1, background: "rgba(0,0,0,0.06)", borderRadius: 12, overflow: "hidden" }}>
          {[
            { label: "Elementos", value: allItems.length.toString() },
            { label: "Espacio",   value: project.roomWidth && project.roomLength ? `${project.roomWidth}×${project.roomLength} cm` : "—" },
            { label: "Subtotal",  value: COP(Number(project.subtotal)) },
            { label: "Total",     value: COP(Number(project.total)), highlight: true },
          ].map(stat => (
            <div key={stat.label} style={{
              background: stat.highlight ? "#1a1a18" : "#faf8f5",
              padding: "1.25rem 1.5rem",
            }}>
              <p style={{ fontFamily: "system-ui", fontSize: 11, letterSpacing: "0.1em", color: stat.highlight ? "#888" : "#aaa", marginBottom: 6 }}>
                {stat.label.toUpperCase()}
              </p>
              <p style={{ fontSize: stat.highlight ? "1.4rem" : "1.2rem", fontWeight: 400, color: stat.highlight ? "#fff" : "#1a1a18" }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── View tabs ───────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", gap: 0,
        borderBottom: "1px solid rgba(0,0,0,0.08)",
        background: "#faf8f5",
        position: "sticky", top: 55, zIndex: 40,
        padding: "0 2rem",
        maxWidth: "100%", overflowX: "auto",
      }}>
        {([
          ["overview",  "Resumen"],
          ["3d",        "Vista 3D"],
          ["details",   "Detalle"],
          ["customize", "Personalizar"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            style={{
              fontFamily: "system-ui", fontSize: 13, padding: "14px 20px",
              background: "none", border: "none", cursor: "pointer",
              borderBottom: view === id ? "2px solid #1a1a18" : "2px solid transparent",
              color: view === id ? "#1a1a18" : "#999",
              fontWeight: view === id ? 500 : 400,
              whiteSpace: "nowrap",
              transition: "color 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: view === "3d" ? "100%" : 900, margin: "0 auto", padding: view === "3d" ? 0 : "2.5rem 2rem" }}>

        {view === "overview"  && <OverviewSection  project={project} allItems={allItems} />}
        {view === "3d"        && <ViewerSection    project={project} />}
        {view === "details"   && <DetailsSection   project={project} allItems={allItems} />}
        {view === "customize" && (
          submitted
            ? <ThankYouSection />
            : <CustomizeSection project={project} token={token} onSubmitted={() => setSubmitted(true)} />
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div style={{
        marginTop: "4rem", borderTop: "1px solid rgba(0,0,0,0.06)",
        padding: "2rem", textAlign: "center",
        fontFamily: "system-ui", fontSize: 12, color: "#bbb",
      }}>
        Este documento es confidencial y fue preparado exclusivamente para {project.clientName}
      </div>
    </div>
  );
}

// ─── Overview section ─────────────────────────────────────────────────────────

function OverviewSection({ project, allItems }: {
  project: PortalProject;
  allItems: PortalProject["layoutGroups"][number]["items"];
}) {
  const byGroup = project.layoutGroups.filter(g => g.items.length > 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
      {/* Left: groups */}
      <div>
        <SectionTitle>Distribución</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {byGroup.map(group => (
            <div key={group.id} style={{
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 10, overflow: "hidden",
            }}>
              <div style={{
                padding: "10px 16px", background: "#f5f2ee",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontFamily: "system-ui", fontSize: 13, fontWeight: 500 }}>{group.name}</span>
                <span style={{ fontFamily: "system-ui", fontSize: 11, color: "#999" }}>
                  {group.items.length} elementos
                </span>
              </div>
              {group.items.map(item => (
                <div key={item.id} style={{
                  padding: "8px 16px",
                  display: "flex", justifyContent: "space-between",
                  borderTop: "1px solid rgba(0,0,0,0.05)",
                  fontFamily: "system-ui", fontSize: 13,
                }}>
                  <span style={{ color: "#444" }}>
                    {item.label ?? item.elementType.name}
                    {item.quantity > 1 && <span style={{ color: "#aaa", marginLeft: 6 }}>×{item.quantity}</span>}
                  </span>
                  <span style={{ color: "#888" }}>{item.width}×{item.height}×{item.depth} cm</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Right: materials preview */}
      <div>
        <SectionTitle>Materiales</SectionTitle>
        <MaterialsGrid items={allItems} />

        {project.projectFinishes.length > 0 && (
          <>
            <SectionTitle style={{ marginTop: 28 }}>Acabados de obra</SectionTitle>
            {project.projectFinishes.map(pf => (
              <div key={pf.id} style={{
                display: "flex", justifyContent: "space-between",
                padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.06)",
                fontFamily: "system-ui", fontSize: 13,
              }}>
                <span style={{ color: "#444" }}>{pf.finish.name}</span>
                <span style={{ color: "#888" }}>{pf.areaM2} m²</span>
              </div>
            ))}
          </>
        )}

        {/* AI Render */}
        {project.aiRenderUrl && (
          <div style={{ marginTop: 24 }}>
            <SectionTitle>Render del espacio</SectionTitle>
            <img
              src={project.aiRenderUrl}
              alt="Render de la cocina"
              style={{ width: "100%", borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 3D Viewer section ────────────────────────────────────────────────────────

function ViewerSection({ project }: { project: PortalProject }) {
  // Adapt portal project shape to what KitchenViewer expects
  // KitchenViewer needs the full project from quotes.getProject
  // Portal project has the same structure, just fewer fields exposed
  const adaptedProject = {
    ...project,
    // Fields KitchenViewer needs that portal omits — safe defaults
    shareToken: "",
    shareExpiry: null,
    referenceImageUrl: null,
    notes: null,
    tax: project.total, // approximation
    createdAt: new Date(),
    updatedAt: new Date(),
    status: project.status as any,
    userId: "",
    clientId: "",
    client: { id: "", name: project.clientName, email: null, phone: null, address: null, userId: "", createdAt: new Date() },
  } as any;

  return (
    <div style={{ height: "calc(100vh - 120px)", background: "#0e0e12" }}>
      {/* Provide a minimal context for KitchenViewer */}
      <QuoteBuilderProvider projectId={project.id}>
        <KitchenViewer project={adaptedProject} className="h-full w-full" />
      </QuoteBuilderProvider>

      <div style={{
        position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
        padding: "8px 16px", borderRadius: 20,
        fontFamily: "system-ui", fontSize: 12, color: "rgba(255,255,255,0.6)",
      }}>
        Arrastra para orbitar · Scroll para zoom · Click derecho para desplazar
      </div>
    </div>
  );
}

// ─── Details section ──────────────────────────────────────────────────────────

function DetailsSection({ project, allItems }: {
  project: PortalProject;
  allItems: PortalProject["layoutGroups"][number]["items"];
}) {
  const [openItem, setOpenItem] = useState<string | null>(null);

  return (
    <div>
      <SectionTitle>Desglose de elementos</SectionTitle>

      <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "rgba(0,0,0,0.04)", borderRadius: 12, overflow: "hidden" }}>
        {allItems.map(item => {
          const isOpen = openItem === item.id;
          return (
            <div key={item.id} style={{ background: "#faf8f5" }}>
              {/* Row header */}
              <button
                onClick={() => setOpenItem(isOpen ? null : item.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center",
                  justifyContent: "space-between", padding: "14px 20px",
                  background: "none", border: "none", cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div>
                  <span style={{ fontFamily: "system-ui", fontSize: 14, fontWeight: 500, color: "#1a1a18" }}>
                    {item.label ?? item.elementType.name}
                  </span>
                  {item.quantity > 1 && (
                    <span style={{ fontFamily: "system-ui", fontSize: 12, color: "#aaa", marginLeft: 8 }}>×{item.quantity}</span>
                  )}
                  <span style={{ fontFamily: "system-ui", fontSize: 12, color: "#bbb", marginLeft: 12 }}>
                    {item.width} × {item.height} × {item.depth} cm
                  </span>
                </div>
                <span style={{ fontFamily: "system-ui", fontSize: 14, color: "#444" }}>
                  {isOpen ? "−" : "+"}
                </span>
              </button>

              {/* Expanded components */}
              {isOpen && (
                <div style={{ padding: "0 20px 16px", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  {item.components.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <p style={{ fontFamily: "system-ui", fontSize: 11, letterSpacing: "0.1em", color: "#aaa", marginBottom: 8 }}>
                        PANELES
                      </p>
                      {item.components.map(comp => (
                        <div key={comp.id} style={{
                          display: "flex", gap: 12, alignItems: "flex-start",
                          padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.04)",
                        }}>
                          {/* Material swatch */}
                          <div style={{
                            width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                            background: comp.surfaceFinish?.color ?? comp.material?.color ?? "#ddd",
                            border: "1px solid rgba(0,0,0,0.1)",
                            backgroundImage: comp.surfaceFinish?.textureUrl
                              ? `url(${comp.surfaceFinish.textureUrl})`
                              : comp.material?.textureUrl
                              ? `url(${comp.material.textureUrl})`
                              : undefined,
                            backgroundSize: "cover",
                          }} />
                          <div style={{ flex: 1 }}>
                            <p style={{ fontFamily: "system-ui", fontSize: 13, color: "#333" }}>
                              {comp.componentType.replace(/_/g, " ").toLowerCase().replace(/^\w/, c => c.toUpperCase())}
                              {comp.label && <span style={{ color: "#aaa", marginLeft: 6 }}>— {comp.label}</span>}
                            </p>
                            <p style={{ fontFamily: "system-ui", fontSize: 11, color: "#aaa" }}>
                              {comp.widthCm.toFixed(1)} × {comp.heightCm.toFixed(1)} cm
                              {comp.material && <span style={{ marginLeft: 8 }}>{comp.material.name}</span>}
                              {comp.surfaceFinish && <span style={{ marginLeft: 4 }}>· {comp.surfaceFinish.name}</span>}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {item.hardwareItems.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <p style={{ fontFamily: "system-ui", fontSize: 11, letterSpacing: "0.1em", color: "#aaa", marginBottom: 8 }}>
                        HERRAJES
                      </p>
                      {item.hardwareItems.map(hw => (
                        <div key={hw.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontFamily: "system-ui", fontSize: 13 }}>
                          <span style={{ color: "#444" }}>
                            {hw.hardware.name}
                            <span style={{
                              marginLeft: 8, fontSize: 10, letterSpacing: "0.06em",
                              background: "#f0ede8", color: "#888",
                              padding: "2px 6px", borderRadius: 10,
                            }}>
                              {hw.hardware.qualityTier}
                            </span>
                          </span>
                          <span style={{ color: "#aaa" }}>×{hw.quantity}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div style={{ marginTop: 32, borderTop: "1px solid rgba(0,0,0,0.1)", paddingTop: 24 }}>
        {[
          { label: "Subtotal muebles y materiales", value: Number(project.subtotal) },
          { label: "Acabados de obra", value: project.projectFinishes.reduce((s, f) => s + Number(f.totalPrice), 0) },
        ].map(row => (
          <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontFamily: "system-ui", fontSize: 14, color: "#666" }}>
            <span>{row.label}</span>
            <span>{COP(row.value)}</span>
          </div>
        ))}
        <div style={{
          display: "flex", justifyContent: "space-between", padding: "16px 0",
          marginTop: 8, borderTop: "2px solid #1a1a18",
          fontFamily: "system-ui", fontSize: 18, fontWeight: 600,
        }}>
          <span>Total del proyecto</span>
          <span>{COP(Number(project.total))}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Customize section ────────────────────────────────────────────────────────

function CustomizeSection({ project, token, onSubmitted }: {
  project: PortalProject;
  token: string;
  onSubmitted: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [componentPrefs, setComponentPrefs] = useState<Record<string, string>>({});
  const [action, setAction] = useState<"approve" | "changes" | null>(null);

  const submitPrefs = api.portal.submitClientPreferences.useMutation({
    onSuccess: onSubmitted,
  });

  const allComponents = project.layoutGroups
    .flatMap(g => g.items)
    .flatMap(i => i.components.map(c => ({ ...c, itemLabel: i.label ?? i.elementType.name })));

  const handleSubmit = () => {
    if (!action) return;
    submitPrefs.mutate({
      token,
      preferences: Object.entries(componentPrefs).map(([componentId, note]) => ({
        componentId,
        notes: note,
      })),
      clientNotes: [
        action === "approve" ? "✅ APROBADO" : "🔄 SOLICITA CAMBIOS",
        notes,
      ].filter(Boolean).join("\n\n"),
    });
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <SectionTitle>Personalización</SectionTitle>
      <p style={{ fontFamily: "system-ui", fontSize: 14, color: "#666", marginBottom: 32, lineHeight: 1.7 }}>
        Revisa los materiales de cada panel y deja tus comentarios. Una vez enviado,
        el instalador recibirá tus preferencias para afinar la propuesta.
      </p>

      {/* Per-component notes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 40 }}>
        {allComponents.map(comp => (
          <div key={comp.id} style={{
            display: "flex", gap: 16, alignItems: "flex-start",
            padding: "16px", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10,
          }}>
            {/* Swatch */}
            <div style={{
              width: 36, height: 36, borderRadius: 8, flexShrink: 0,
              background: comp.surfaceFinish?.color ?? comp.material?.color ?? "#ddd",
              backgroundImage: comp.surfaceFinish?.textureUrl ? `url(${comp.surfaceFinish.textureUrl})` : undefined,
              backgroundSize: "cover",
              border: "1px solid rgba(0,0,0,0.1)",
            }} />

            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "system-ui", fontSize: 13, fontWeight: 500, color: "#1a1a18", marginBottom: 2 }}>
                {comp.itemLabel} — {comp.componentType.replace(/_/g, " ")}
              </p>
              <p style={{ fontFamily: "system-ui", fontSize: 12, color: "#aaa", marginBottom: 8 }}>
                {comp.material?.name ?? "Sin material"} {comp.surfaceFinish ? `· ${comp.surfaceFinish.name}` : ""}
              </p>
              <input
                type="text"
                placeholder="Alguna preferencia sobre este panel... (opcional)"
                value={componentPrefs[comp.id] ?? ""}
                onChange={e => setComponentPrefs(p => ({ ...p, [comp.id]: e.target.value }))}
                style={{
                  width: "100%", fontFamily: "system-ui", fontSize: 13,
                  padding: "8px 12px", border: "1px solid rgba(0,0,0,0.12)",
                  borderRadius: 8, background: "#faf8f5", outline: "none",
                  color: "#1a1a18",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* General notes */}
      <div style={{ marginBottom: 32 }}>
        <label style={{ fontFamily: "system-ui", fontSize: 13, fontWeight: 500, color: "#444", display: "block", marginBottom: 8 }}>
          Comentarios generales
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={4}
          placeholder="¿Hay algo que quieras cambiar o comentar sobre la propuesta?"
          style={{
            width: "100%", fontFamily: "system-ui", fontSize: 14,
            padding: "12px 16px", border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: 10, background: "#faf8f5", resize: "vertical",
            outline: "none", color: "#1a1a18", lineHeight: 1.6,
          }}
        />
      </div>

      {/* Decision */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <ActionButton
          selected={action === "approve"}
          onClick={() => setAction("approve")}
          color="#1a5c2a"
        >
          ✓ Aprobar propuesta
        </ActionButton>
        <ActionButton
          selected={action === "changes"}
          onClick={() => setAction("changes")}
          color="#7a4010"
        >
          ↺ Solicitar cambios
        </ActionButton>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!action || submitPrefs.isPending}
        style={{
          width: "100%", padding: "14px", fontFamily: "system-ui",
          fontSize: 15, fontWeight: 500, letterSpacing: "0.02em",
          background: action ? "#1a1a18" : "#ccc",
          color: "#faf8f5", border: "none", borderRadius: 10,
          cursor: action ? "pointer" : "not-allowed",
          transition: "background 0.2s",
        }}
      >
        {submitPrefs.isPending ? "Enviando..." : "Enviar respuesta"}
      </button>
    </div>
  );
}

function ThankYouSection() {
  return (
    <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
      <h2 style={{ fontSize: "2rem", fontWeight: 400, marginBottom: 12 }}>¡Respuesta enviada!</h2>
      <p style={{ fontFamily: "system-ui", fontSize: 15, color: "#666", lineHeight: 1.7 }}>
        El instalador recibió tus comentarios y se pondrá en contacto contigo
        para continuar con los siguientes pasos.
      </p>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function SectionTitle({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <h2 style={{
      fontSize: "1.1rem", fontWeight: 400, marginBottom: 20,
      paddingBottom: 10, borderBottom: "1px solid rgba(0,0,0,0.08)",
      ...style,
    }}>
      {children}
    </h2>
  );
}

function ActionButton({ children, selected, onClick, color }: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: "12px 16px",
        fontFamily: "system-ui", fontSize: 14,
        border: `1.5px solid ${selected ? color : "rgba(0,0,0,0.12)"}`,
        borderRadius: 10, cursor: "pointer",
        background: selected ? color + "12" : "#faf8f5",
        color: selected ? color : "#666",
        fontWeight: selected ? 500 : 400,
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function MaterialsGrid({ items }: { items: PortalProject["layoutGroups"][number]["items"] }) {
  const seen = new Set<string>();
  const swatches: Array<{ color: string | null; textureUrl: string | null; name: string }> = [];

  for (const item of items) {
    for (const comp of item.components) {
      const key = comp.surfaceFinish?.id ?? comp.material?.id;
      if (key && !seen.has(key)) {
        seen.add(key);
        swatches.push({
          color:      comp.surfaceFinish?.color ?? comp.material?.color ?? null,
          textureUrl: comp.surfaceFinish?.textureUrl ?? comp.material?.textureUrl ?? null,
          name:       comp.surfaceFinish?.name ?? comp.material?.name ?? "Material",
        });
      }
    }
  }

  if (swatches.length === 0) return (
    <p style={{ fontFamily: "system-ui", fontSize: 13, color: "#bbb" }}>Sin materiales asignados aún</p>
  );

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {swatches.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: s.color ?? "#ddd",
            backgroundImage: s.textureUrl ? `url(${s.textureUrl})` : undefined,
            backgroundSize: "cover",
            border: "1px solid rgba(0,0,0,0.1)",
            flexShrink: 0,
          }} />
          <span style={{ fontFamily: "system-ui", fontSize: 12, color: "#666" }}>{s.name}</span>
        </div>
      ))}
    </div>
  );
}