"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/trpc/react";
import { useSession, signOut } from "next-auth/react";
import {
  Plus, Search, FolderOpen, Calendar, DollarSign, Users,
  MoreVertical, Edit3, Trash2, Copy, Share2, Star, StarOff,
  TrendingUp, Home, FileText, Settings, LogOut, Menu, X,
} from "lucide-react";
import type { RouterOutputs } from "@/trpc/react";

// ─── Tipos desde el router real ───────────────────────────────────────────────

type ProjectSummary = RouterOutputs["quotes"]["listProjects"][number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador", SENT: "Enviada", REVIEWING: "En revisión",
  APPROVED: "Aprobada", REJECTED: "Rechazada",
  IN_PROGRESS: "En proceso", COMPLETED: "Completada",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT:       "bg-gray-100 text-gray-700",
  SENT:        "bg-blue-100 text-blue-700",
  REVIEWING:   "bg-yellow-100 text-yellow-700",
  APPROVED:    "bg-green-100 text-green-700",
  REJECTED:    "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-purple-100 text-purple-700",
  COMPLETED:   "bg-emerald-100 text-emerald-700",
};

// ─── Página ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [createOpen, setCreateOpen]   = useState(false);

  // ── Datos reales ────────────────────────────────────────────────────────────
  const {
    data: projects = [],
    isLoading,
    refetch,
  } = api.quotes.listProjects.useQuery();

  const { data: clients = [] } = api.clients.list.useQuery();

  // ── Stats derivados del servidor ────────────────────────────────────────────
  const stats = {
    total:     projects.length,
    active:    projects.filter(p => ["IN_PROGRESS", "REVIEWING"].includes(p.status)).length,
    completed: projects.filter(p => p.status === "COMPLETED").length,
    revenue:   projects.reduce((s, p) => s + Number(p.total), 0),
    avg:       projects.length
      ? projects.reduce((s, p) => s + Number(p.total), 0) / projects.length
      : 0,
  };

  // ── Filtrado client-side ─────────────────────────────────────────────────────
  const filtered = projects.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(q) ||
      p.client.name.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // ── Mutations ────────────────────────────────────────────────────────────────
  const deleteProject = api.quotes.deleteProject.useMutation({
    onSuccess: () => void refetch(),
  });

  // Favoritos: guardamos en localStorage (no hay campo en DB actual)
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    const stored = localStorage.getItem("fav_projects");
    return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
  });

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem("fav_projects", JSON.stringify([...next]));
      return next;
    });
  };

  const userName = session?.user?.name?.split(" ")[0] ?? "Instalador";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className={`fixed left-0 top-0 h-full bg-white border-r border-slate-200 transition-all duration-300 z-30 ${sidebarOpen ? "w-64" : "w-20"}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-100">
            <div className={`flex items-center ${sidebarOpen ? "justify-between" : "justify-center"}`}>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-slate-800 to-slate-600 rounded-lg" />
                {sidebarOpen && <span className="font-semibold text-slate-800">CocinasPro</span>}
              </div>
              <button onClick={() => setSidebarOpen(o => !o)} className="p-1 hover:bg-slate-100 rounded-lg transition">
                {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <NavItem icon={Home}      label="Dashboard"   active href="/dashboard"          isSidebarOpen={sidebarOpen} />
            <NavItem icon={FolderOpen} label="Proyectos"   href="/dashboard"                isSidebarOpen={sidebarOpen} />
            <NavItem icon={Users}     label="Clientes"    href="/dashboard/clients"         isSidebarOpen={sidebarOpen} />
            <NavItem icon={FileText}  label="Catálogo"    href="/dashboard/catalog"         isSidebarOpen={sidebarOpen} />
            <NavItem icon={Settings}  label="Ajustes"     href="/dashboard/settings"        isSidebarOpen={sidebarOpen} />
          </nav>

          <div className="p-4 border-t border-slate-100">
            <div className={`flex items-center ${sidebarOpen ? "justify-between" : "justify-center"}`}>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-slate-600">
                    {session?.user?.name?.slice(0, 2).toUpperCase() ?? "??"}
                  </span>
                </div>
                {sidebarOpen && (
                  <div>
                    <p className="text-sm font-medium text-slate-800">{session?.user?.name}</p>
                    <p className="text-xs text-slate-500">Instalador</p>
                  </div>
                )}
              </div>
              {sidebarOpen && (
                <button onClick={() => void signOut({ callbackUrl: "/" })}
                  className="p-1 hover:bg-slate-100 rounded-lg transition">
                  <LogOut className="w-4 h-4 text-slate-500" />
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <main className={`transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-20"}`}>
        <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="px-8 py-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
              <p className="text-slate-500 mt-1">Bienvenido, {userName}</p>
            </div>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nuevo Proyecto
            </button>
          </div>
        </div>

        <div className="p-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard title="Proyectos totales"  value={String(stats.total)}     icon={FolderOpen} trend="+12%" color="blue" />
            <StatCard title="Proyectos activos"  value={String(stats.active)}    icon={TrendingUp} trend={`+${stats.active}`} color="purple" />
            <StatCard title="Ingresos totales"   value={COP(stats.revenue)}      icon={DollarSign} trend="+23%" color="green" />
            <StatCard title="Valor promedio"     value={COP(stats.avg)}          icon={Calendar}   trend="+5%"  color="orange" />
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por proyecto o cliente..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {["all", "DRAFT", "IN_PROGRESS", "REVIEWING", "APPROVED", "COMPLETED"].map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                      statusFilter === s
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {s === "all" ? "Todos" : STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Lista de proyectos */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">
                Mis proyectos
                {filtered.length !== projects.length && (
                  <span className="ml-2 text-sm font-normal text-slate-400">
                    ({filtered.length} de {projects.length})
                  </span>
                )}
              </h2>
            </div>

            {isLoading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-slate-800" />
                <p className="mt-4 text-slate-500">Cargando proyectos...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <FolderOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">
                  {projects.length === 0
                    ? "Aún no tienes proyectos. Crea el primero."
                    : "Sin resultados para esta búsqueda"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filtered.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    isFavorite={favorites.has(project.id)}
                    onEdit={() => router.push(`/projects/${project.id}/builder`)}
                    onDelete={() => {
                      if (confirm("¿Eliminar este proyecto? Esta acción no se puede deshacer.")) {
                        deleteProject.mutate({ id: project.id });
                      }
                    }}
                    onToggleFavorite={() => toggleFavorite(project.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Modal crear proyecto ─────────────────────────────────────────── */}
      <AnimatePresence>
        {createOpen && (
          <CreateProjectModal
            clients={clients}
            onClose={() => setCreateOpen(false)}
            onCreated={(id) => router.push(`/projects/${id}/builder`)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Modal crear proyecto ─────────────────────────────────────────────────────

function CreateProjectModal({ clients, onClose, onCreated }: {
  clients: RouterOutputs["clients"]["list"];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName]         = useState("");
  const [clientId, setClientId] = useState("");
  const [newClient, setNewClient] = useState("");  // si elige "nuevo cliente"
  const [mode, setMode]         = useState<"existing" | "new">("existing");

  const [roomW, setRoomW] = useState("");
  const [roomL, setRoomL] = useState("");
  const [roomH, setRoomH] = useState("240");

  const createClient  = api.clients.create.useMutation();
  const createProject = api.quotes.createProject.useMutation({
    onSuccess: (p) => onCreated(p.id),
  });

  const isLoading = createClient.isPending || createProject.isPending;

  const handleCreate = async () => {
    if (!name.trim()) return;

    let finalClientId = clientId;

    // Crear cliente nuevo si corresponde
    if (mode === "new" && newClient.trim()) {
      const client = await createClient.mutateAsync({ name: newClient.trim() });
      finalClientId = client.id;
    }

    if (!finalClientId) return;

    createProject.mutate({
      clientId: finalClientId,
      name: name.trim(),
      roomWidth:  roomW ? parseFloat(roomW)  : undefined,
      roomLength: roomL ? parseFloat(roomL)  : undefined,
      roomHeight: roomH ? parseFloat(roomH)  : undefined,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl max-w-md w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-5">Nuevo proyecto</h2>

          <div className="space-y-4">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nombre del proyecto <span className="text-red-500">*</span>
              </label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: Cocina moderna — Familia Pérez"
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            {/* Cliente */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Cliente <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setMode("existing")}
                  className={`flex-1 py-1.5 rounded-lg text-sm border transition ${
                    mode === "existing"
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Cliente existente
                </button>
                <button
                  onClick={() => setMode("new")}
                  className={`flex-1 py-1.5 rounded-lg text-sm border transition ${
                    mode === "new"
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Nuevo cliente
                </button>
              </div>

              {mode === "existing" ? (
                <select
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm"
                >
                  <option value="">— Seleccionar cliente —</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={newClient}
                  onChange={e => setNewClient(e.target.value)}
                  placeholder="Nombre del cliente"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              )}
            </div>

            {/* Dimensiones del espacio — opcionales */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Dimensiones del espacio <span className="text-slate-400 font-normal">(opcional, en cm)</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Ancho", val: roomW, set: setRoomW },
                  { label: "Largo", val: roomL, set: setRoomL },
                  { label: "Alto",  val: roomH, set: setRoomH },
                ].map(({ label, val, set }) => (
                  <div key={label}>
                    <p className="text-xs text-slate-400 mb-1">{label}</p>
                    <input
                      type="number"
                      min={50}
                      max={2000}
                      value={val}
                      onChange={e => set(e.target.value)}
                      placeholder="cm"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              onClick={() => void handleCreate()}
              disabled={!name.trim() || (mode === "existing" ? !clientId : !newClient.trim()) || isLoading}
              className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition disabled:opacity-50"
            >
              {isLoading ? "Creando..." : "Crear y abrir builder"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Tarjeta de proyecto ──────────────────────────────────────────────────────

function ProjectCard({ project, isFavorite, onEdit, onDelete, onToggleFavorite }: {
  project: ProjectSummary;
  isFavorite: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="p-6 hover:bg-slate-50 transition group relative">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <button onClick={onToggleFavorite}>
              {isFavorite
                ? <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                : <StarOff className="w-4 h-4 text-slate-300" />
              }
            </button>
            <h3 className="font-semibold text-slate-800 truncate">{project.name}</h3>
            <span className={`px-2 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap ${STATUS_COLORS[project.status] ?? STATUS_COLORS.DRAFT}`}>
              {STATUS_LABELS[project.status] ?? project.status}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-400 text-xs">Cliente</p>
              <p className="text-slate-700 font-medium truncate">{project.client.name}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Total</p>
              <p className="text-slate-700 font-medium">
                {Number(project.total) > 0 ? COP(Number(project.total)) : "Sin cotizar"}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Actualizado</p>
              <p className="text-slate-600">
                {new Date(project.updatedAt).toLocaleDateString("es-CO")}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Creado</p>
              <p className="text-slate-600">
                {new Date(project.createdAt).toLocaleDateString("es-CO")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            title="Abrir builder"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-20">
                  <button
                    onClick={() => { router.push(`/portal/${project.shareToken}`); setMenuOpen(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4" /> Portal cliente
                  </button>
                  <button
                    onClick={() => {
                      void navigator.clipboard.writeText(
                        `${window.location.origin}/portal/${project.shareToken}`
                      );
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" /> Copiar enlace
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    onClick={() => { onDelete(); setMenuOpen(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Eliminar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function NavItem({ icon: Icon, label, active, isSidebarOpen, href }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  isSidebarOpen: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center ${isSidebarOpen ? "space-x-3" : "justify-center"} px-3 py-2 rounded-xl transition group ${
        active ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      <Icon className={`w-5 h-5 ${active ? "text-slate-900" : "group-hover:text-slate-900"}`} />
      {isSidebarOpen && <span className="text-sm font-medium">{label}</span>}
    </Link>
  );
}

function StatCard({ title, value, icon: Icon, trend, color }: {
  title: string; value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string; color: string;
}) {
  const colors: Record<string, string> = {
    blue:   "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    green:  "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-slate-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          {trend && <p className="text-xs text-green-600 mt-2">{trend} vs mes anterior</p>}
        </div>
        <div className={`p-3 rounded-xl ${colors[color] ?? colors.blue}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
// "use client";

// import { useState, useEffect } from "react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { motion, AnimatePresence } from "framer-motion";
// import {
//   Plus,
//   Search,
//   Filter,
//   FolderOpen,
//   Calendar,
//   DollarSign,
//   Users,
//   MoreVertical,
//   Edit3,
//   Trash2,
//   Copy,
//   Share2,
//   Eye,
//   Layout3D,
//   Clock,
//   CheckCircle,
//   AlertCircle,
//   TrendingUp,
//   ArrowRight,
//   Home,
//   FileText,
//   Settings,
//   LogOut,
//   Menu,
//   X,
//   Star,
//   StarOff
// } from "lucide-react";

// // Tipos
// type Project = {
//   id: string;
//   name: string;
//   clientName: string;
//   status: "DRAFT" | "SENT" | "REVIEWING" | "APPROVED" | "REJECTED" | "IN_PROGRESS" | "COMPLETED";
//   total: number;
//   createdAt: Date;
//   updatedAt: Date;
//   roomDimensions?: {
//     width: number;
//     length: number;
//     height: number;
//   };
//   isFavorite?: boolean;
// };

// type ProjectStats = {
//   totalProjects: number;
//   activeProjects: number;
//   completedProjects: number;
//   totalRevenue: number;
//   averageProjectValue: number;
// };

// export default function DashboardPage() {
//   const router = useRouter();
//   const [projects, setProjects] = useState<Project[]>([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [statusFilter, setStatusFilter] = useState<string>("all");
//   const [isSidebarOpen, setIsSidebarOpen] = useState(true);
//   const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
//   const [newProjectName, setNewProjectName] = useState("");
//   const [selectedClient, setSelectedClient] = useState("");
//   const [isLoading, setIsLoading] = useState(false);

//   // Stats calculados
//   const stats: ProjectStats = {
//     totalProjects: projects.length,
//     activeProjects: projects.filter(p => p.status === "IN_PROGRESS" || p.status === "REVIEWING").length,
//     completedProjects: projects.filter(p => p.status === "COMPLETED").length,
//     totalRevenue: projects.reduce((sum, p) => sum + p.total, 0),
//     averageProjectValue: projects.length > 0 ? projects.reduce((sum, p) => sum + p.total, 0) / projects.length : 0
//   };

//   // Filtrar proyectos
//   const filteredProjects = projects.filter(project => {
//     const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//                           project.clientName.toLowerCase().includes(searchTerm.toLowerCase());
//     const matchesStatus = statusFilter === "all" || project.status === statusFilter;
//     return matchesSearch && matchesStatus;
//   });

//   // Simular carga de datos (reemplazar con API real)
//   useEffect(() => {
//     loadProjects();
//   }, []);

//   const loadProjects = async () => {
//     setIsLoading(true);
//     try {
//       // Simular API call
//       await new Promise(resolve => setTimeout(resolve, 1000));
      
//       // Datos de ejemplo
//       const mockProjects: Project[] = [
//         {
//           id: "proj_1",
//           name: "Cocina Moderna - Pérez",
//           clientName: "Carlos Pérez",
//           status: "IN_PROGRESS",
//           total: 3450000,
//           createdAt: new Date("2024-11-01"),
//           updatedAt: new Date("2024-11-10"),
//           roomDimensions: { width: 400, length: 350, height: 240 },
//           isFavorite: true
//         },
//         {
//           id: "proj_2",
//           name: "Cocina Rústica - Gómez",
//           clientName: "Ana Gómez",
//           status: "DRAFT",
//           total: 0,
//           createdAt: new Date("2024-11-12"),
//           updatedAt: new Date("2024-11-12"),
//           isFavorite: false
//         },
//         {
//           id: "proj_3",
//           name: "Cocina Minimalista - Rodríguez",
//           clientName: "Luis Rodríguez",
//           status: "APPROVED",
//           total: 4250000,
//           createdAt: new Date("2024-10-28"),
//           updatedAt: new Date("2024-11-05"),
//           roomDimensions: { width: 350, length: 300, height: 250 },
//           isFavorite: true
//         },
//         {
//           id: "proj_4",
//           name: "Cocina Industrial - Martínez",
//           clientName: "María Martínez",
//           status: "COMPLETED",
//           total: 5120000,
//           createdAt: new Date("2024-09-15"),
//           updatedAt: new Date("2024-10-20"),
//           isFavorite: false
//         },
//         {
//           id: "proj_5",
//           name: "Cocina Elegante - Sánchez",
//           clientName: "Jorge Sánchez",
//           status: "REVIEWING",
//           total: 2890000,
//           createdAt: new Date("2024-11-08"),
//           updatedAt: new Date("2024-11-11"),
//           roomDimensions: { width: 420, length: 380, height: 260 },
//           isFavorite: false
//         }
//       ];
      
//       setProjects(mockProjects);
//     } catch (error) {
//       console.error("Error loading projects:", error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const createNewProject = async () => {
//     if (!newProjectName.trim()) return;
    
//     setIsLoading(true);
//     try {
//       // Simular creación en API
//       await new Promise(resolve => setTimeout(resolve, 500));
      
//       const newProject: Project = {
//         id: `proj_${Date.now()}`,
//         name: newProjectName,
//         clientName: selectedClient || "Cliente sin especificar",
//         status: "DRAFT",
//         total: 0,
//         createdAt: new Date(),
//         updatedAt: new Date(),
//         isFavorite: false
//       };
      
//       setProjects([newProject, ...projects]);
//       setIsCreateModalOpen(false);
//       setNewProjectName("");
//       setSelectedClient("");
      
//       // Redirigir al builder del nuevo proyecto
//       router.push(`/projects/${newProject.id}/builder`);
//     } catch (error) {
//       console.error("Error creating project:", error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const toggleFavorite = (projectId: string) => {
//     setProjects(projects.map(p => 
//       p.id === projectId ? { ...p, isFavorite: !p.isFavorite } : p
//     ));
//   };

//   const deleteProject = async (projectId: string) => {
//     if (!confirm("¿Estás seguro de eliminar este proyecto?")) return;
    
//     setProjects(projects.filter(p => p.id !== projectId));
//   };

//   const getStatusColor = (status: Project["status"]) => {
//     const colors = {
//       DRAFT: "bg-gray-100 text-gray-700",
//       SENT: "bg-blue-100 text-blue-700",
//       REVIEWING: "bg-yellow-100 text-yellow-700",
//       APPROVED: "bg-green-100 text-green-700",
//       REJECTED: "bg-red-100 text-red-700",
//       IN_PROGRESS: "bg-purple-100 text-purple-700",
//       COMPLETED: "bg-emerald-100 text-emerald-700"
//     };
//     return colors[status];
//   };

//   const getStatusText = (status: Project["status"]) => {
//     const texts = {
//       DRAFT: "Borrador",
//       SENT: "Enviada",
//       REVIEWING: "En Revisión",
//       APPROVED: "Aprobada",
//       REJECTED: "Rechazada",
//       IN_PROGRESS: "En Proceso",
//       COMPLETED: "Completada"
//     };
//     return texts[status];
//   };

//   const formatCurrency = (amount: number) => {
//     return new Intl.NumberFormat('es-CO', {
//       style: 'currency',
//       currency: 'COP',
//       minimumFractionDigits: 0
//     }).format(amount);
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
//       {/* Sidebar */}
//       <aside className={`fixed left-0 top-0 h-full bg-white border-r border-slate-200 transition-all duration-300 z-30 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
//         <div className="flex flex-col h-full">
//           {/* Logo */}
//           <div className="p-6 border-b border-slate-100">
//             <div className={`flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
//               <div className="flex items-center space-x-2">
//                 <div className="w-8 h-8 bg-gradient-to-br from-slate-800 to-slate-600 rounded-lg"></div>
//                 {isSidebarOpen && <span className="font-semibold text-slate-800">CocinasPro</span>}
//               </div>
//               <button
//                 onClick={() => setIsSidebarOpen(!isSidebarOpen)}
//                 className="p-1 hover:bg-slate-100 rounded-lg transition"
//               >
//                 {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
//               </button>
//             </div>
//           </div>

//           {/* Navigation */}
//           <nav className="flex-1 p-4 space-y-2">
//             <NavItem icon={Home} label="Dashboard" active isSidebarOpen={isSidebarOpen} href="/dashboard" />
//             <NavItem icon={FolderOpen} label="Proyectos" isSidebarOpen={isSidebarOpen} href="/dashboard/projects" />
//             <NavItem icon={FileText} label="Cotizaciones" isSidebarOpen={isSidebarOpen} href="/dashboard/quotes" />
//             <NavItem icon={Users} label="Clientes" isSidebarOpen={isSidebarOpen} href="/dashboard/clients" />
//             <NavItem icon={Settings} label="Configuración" isSidebarOpen={isSidebarOpen} href="/dashboard/settings" />
//           </nav>

//           {/* User Section */}
//           <div className="p-4 border-t border-slate-100">
//             <div className={`flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
//               <div className="flex items-center space-x-3">
//                 <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
//                   <span className="text-sm font-medium text-slate-600">JD</span>
//                 </div>
//                 {isSidebarOpen && (
//                   <div>
//                     <p className="text-sm font-medium text-slate-800">Juan Díaz</p>
//                     <p className="text-xs text-slate-500">Instalador</p>
//                   </div>
//                 )}
//               </div>
//               {isSidebarOpen && (
//                 <button className="p-1 hover:bg-slate-100 rounded-lg transition">
//                   <LogOut className="w-4 h-4 text-slate-500" />
//                 </button>
//               )}
//             </div>
//           </div>
//         </div>
//       </aside>

//       {/* Main Content */}
//       <main className={`transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
//         {/* Header */}
//         <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
//           <div className="px-8 py-6">
//             <div className="flex justify-between items-center">
//               <div>
//                 <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
//                 <p className="text-slate-500 mt-1">Bienvenido de nuevo, Juan</p>
//               </div>
//               <button
//                 onClick={() => setIsCreateModalOpen(true)}
//                 className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition shadow-sm"
//               >
//                 <Plus className="w-4 h-4" />
//                 Nuevo Proyecto
//               </button>
//             </div>
//           </div>
//         </div>

//         <div className="p-8">
//           {/* Stats Grid */}
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
//             <StatCard
//               title="Proyectos Totales"
//               value={stats.totalProjects.toString()}
//               icon={FolderOpen}
//               trend="+12%"
//               color="blue"
//             />
//             <StatCard
//               title="Proyectos Activos"
//               value={stats.activeProjects.toString()}
//               icon={TrendingUp}
//               trend="+3"
//               color="purple"
//             />
//             <StatCard
//               title="Ingresos Totales"
//               value={formatCurrency(stats.totalRevenue)}
//               icon={DollarSign}
//               trend="+23%"
//               color="green"
//             />
//             <StatCard
//               title="Valor Promedio"
//               value={formatCurrency(stats.averageProjectValue)}
//               icon={Calendar}
//               trend="+5%"
//               color="orange"
//             />
//           </div>

//           {/* Filters */}
//           <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
//             <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
//               <div className="relative flex-1 max-w-md">
//                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
//                 <input
//                   type="text"
//                   placeholder="Buscar proyectos..."
//                   value={searchTerm}
//                   onChange={(e) => setSearchTerm(e.target.value)}
//                   className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
//                 />
//               </div>
//               <div className="flex gap-2">
//                 {["all", "DRAFT", "IN_PROGRESS", "REVIEWING", "APPROVED", "COMPLETED"].map(status => (
//                   <button
//                     key={status}
//                     onClick={() => setStatusFilter(status)}
//                     className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
//                       statusFilter === status
//                         ? "bg-slate-900 text-white"
//                         : "bg-slate-100 text-slate-600 hover:bg-slate-200"
//                     }`}
//                   >
//                     {status === "all" ? "Todos" : getStatusText(status as Project["status"])}
//                   </button>
//                 ))}
//               </div>
//             </div>
//           </div>

//           {/* Projects List */}
//           <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
//             <div className="px-6 py-4 border-b border-slate-100">
//               <h2 className="font-semibold text-slate-800">Mis Proyectos</h2>
//             </div>
            
//             {isLoading ? (
//               <div className="p-12 text-center">
//                 <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-slate-800"></div>
//                 <p className="mt-4 text-slate-500">Cargando proyectos...</p>
//               </div>
//             ) : filteredProjects.length === 0 ? (
//               <div className="p-12 text-center">
//                 <FolderOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
//                 <p className="text-slate-500">No hay proyectos que coincidan con tu búsqueda</p>
//               </div>
//             ) : (
//               <div className="divide-y divide-slate-100">
//                 {filteredProjects.map((project) => (
//                   <ProjectCard
//                     key={project.id}
//                     project={project}
//                     onEdit={() => router.push(`/projects/${project.id}/builder`)}
//                     onDelete={() => deleteProject(project.id)}
//                     onToggleFavorite={() => toggleFavorite(project.id)}
//                     formatCurrency={formatCurrency}
//                     getStatusColor={getStatusColor}
//                     getStatusText={getStatusText}
//                   />
//                 ))}
//               </div>
//             )}
//           </div>
//         </div>
//       </main>

//       {/* Create Project Modal */}
//       <AnimatePresence>
//         {isCreateModalOpen && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
//             onClick={() => setIsCreateModalOpen(false)}
//           >
//             <motion.div
//               initial={{ scale: 0.95, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.95, opacity: 0 }}
//               className="bg-white rounded-2xl shadow-xl max-w-md w-full"
//               onClick={(e) => e.stopPropagation()}
//             >
//               <div className="p-6">
//                 <h2 className="text-xl font-semibold text-slate-800 mb-4">Crear Nuevo Proyecto</h2>
                
//                 <div className="space-y-4">
//                   <div>
//                     <label className="block text-sm font-medium text-slate-700 mb-1">
//                       Nombre del Proyecto
//                     </label>
//                     <input
//                       type="text"
//                       value={newProjectName}
//                       onChange={(e) => setNewProjectName(e.target.value)}
//                       placeholder="Ej: Cocina Moderna - Pérez"
//                       className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400"
//                       autoFocus
//                     />
//                   </div>
                  
//                   <div>
//                     <label className="block text-sm font-medium text-slate-700 mb-1">
//                       Nombre del Cliente (opcional)
//                     </label>
//                     <input
//                       type="text"
//                       value={selectedClient}
//                       onChange={(e) => setSelectedClient(e.target.value)}
//                       placeholder="Nombre del cliente"
//                       className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400"
//                     />
//                   </div>
//                 </div>

//                 <div className="flex gap-3 mt-6">
//                   <button
//                     onClick={() => setIsCreateModalOpen(false)}
//                     className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition"
//                   >
//                     Cancelar
//                   </button>
//                   <button
//                     onClick={createNewProject}
//                     disabled={!newProjectName.trim() || isLoading}
//                     className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition disabled:opacity-50"
//                   >
//                     {isLoading ? "Creando..." : "Crear Proyecto"}
//                   </button>
//                 </div>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </div>
//   );
// }

// // Componentes auxiliares
// function NavItem({ icon: Icon, label, active, isSidebarOpen, href }: any) {
//   const LinkComponent = href ? Link : 'button';
//   const props = href ? { href } : {};
  
//   return (
//     <LinkComponent
//       {...props}
//       className={`flex items-center ${isSidebarOpen ? 'space-x-3' : 'justify-center'} px-3 py-2 rounded-xl transition group ${
//         active ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
//       }`}
//     >
//       <Icon className={`w-5 h-5 ${active ? 'text-slate-900' : 'group-hover:text-slate-900'}`} />
//       {isSidebarOpen && <span className="text-sm font-medium">{label}</span>}
//     </LinkComponent>
//   );
// }

// function StatCard({ title, value, icon: Icon, trend, color }: any) {
//   const colors = {
//     blue: "bg-blue-50 text-blue-600",
//     purple: "bg-purple-50 text-purple-600",
//     green: "bg-green-50 text-green-600",
//     orange: "bg-orange-50 text-orange-600"
//   };
  
//   return (
//     <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition">
//       <div className="flex justify-between items-start">
//         <div>
//           <p className="text-sm text-slate-500 mb-1">{title}</p>
//           <p className="text-2xl font-bold text-slate-900">{value}</p>
//           {trend && (
//             <p className="text-xs text-green-600 mt-2">{trend} vs mes anterior</p>
//           )}
//         </div>
//         <div className={`p-3 rounded-xl ${colors[color]}`}>
//           <Icon className="w-5 h-5" />
//         </div>
//       </div>
//     </div>
//   );
// }

// function ProjectCard({ project, onEdit, onDelete, onToggleFavorite, formatCurrency, getStatusColor, getStatusText }: any) {
//   const [showMenu, setShowMenu] = useState(false);
  
//   return (
//     <div className="p-6 hover:bg-slate-50 transition group">
//       <div className="flex items-start justify-between">
//         <div className="flex-1">
//           <div className="flex items-center gap-3 mb-2">
//             <button onClick={onToggleFavorite} className="focus:outline-none">
//               {project.isFavorite ? (
//                 <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
//               ) : (
//                 <StarOff className="w-4 h-4 text-slate-300" />
//               )}
//             </button>
//             <h3 className="font-semibold text-slate-800">{project.name}</h3>
//             <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(project.status)}`}>
//               {getStatusText(project.status)}
//             </span>
//           </div>
          
//           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
//             <div>
//               <p className="text-slate-400">Cliente</p>
//               <p className="text-slate-700 font-medium">{project.clientName}</p>
//             </div>
//             <div>
//               <p className="text-slate-400">Valor</p>
//               <p className="text-slate-700 font-medium">
//                 {project.total > 0 ? formatCurrency(project.total) : "No cotizado"}
//               </p>
//             </div>
//             <div>
//               <p className="text-slate-400">Última actualización</p>
//               <p className="text-slate-700">{project.updatedAt.toLocaleDateString('es-CO')}</p>
//             </div>
//             <div>
//               <p className="text-slate-400">Creado</p>
//               <p className="text-slate-700">{project.createdAt.toLocaleDateString('es-CO')}</p>
//             </div>
//           </div>
          
//           {project.roomDimensions && (
//             <div className="mt-3 flex gap-4 text-xs text-slate-400">
//               <span>Ancho: {project.roomDimensions.width}cm</span>
//               <span>Largo: {project.roomDimensions.length}cm</span>
//               <span>Alto: {project.roomDimensions.height}cm</span>
//             </div>
//           )}
//         </div>
        
//         <div className="flex gap-2">
//           <button
//             onClick={onEdit}
//             className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
//           >
//             <Edit3 className="w-4 h-4" />
//           </button>
//           <div className="relative">
//             <button
//               onClick={() => setShowMenu(!showMenu)}
//               className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
//             >
//               <MoreVertical className="w-4 h-4" />
//             </button>
//             {showMenu && (
//               <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-10">
//                 <button className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2">
//                   <Share2 className="w-4 h-4" />
//                   Compartir
//                 </button>
//                 <button className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2">
//                   <Copy className="w-4 h-4" />
//                   Duplicar
//                 </button>
//                 <button
//                   onClick={onDelete}
//                   className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
//                 >
//                   <Trash2 className="w-4 h-4" />
//                   Eliminar
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }