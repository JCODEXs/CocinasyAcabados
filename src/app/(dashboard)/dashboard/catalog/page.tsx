/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
"use client";
import type { ElementCategory, MaterialCategory, HardwareCategory, QualityTier, SurfaceFinishType, EdgeType, SupplyCategory, ComponentType } from "@prisma/client";
import { ComponentTemplatesEditor } from "@/app/_components/quote-builder/ComponentTemplatateEditor";


// interface Material {
//   id: string;
//   name: string;
//   category: string;
//   pricePerM2: number;
//   thicknessMM: number;
//   color: string;
//   aiDescription: string;
// }

// interface Hardware {
//   id: string;
//   name: string;
//   category: string;
//   qualityTier: string;
//   brand: string;
//   pricePerUnit: number;
//   unit: string;
//   description: string;
// }

// interface Finish {
//   id: string;
//   name: string;
//   pricePerM2: number;
//   unit: string;
// }

// interface EdgeTreatment {
//   id: string;
//   name: string;
//   type: string;
//   pricePerML: number;
// }

// interface AssemblySupply {
//   id: string;
//   name: string;
//   category: string;
//   unit: string;
//   pricePerUnit: number;
//   autoCalcRule: string;
// }
const COMPONENT_TYPES = [
  "LATERAL", "FONDO", "TECHO", "PISO", "ENTREPAÑO",
  "PUERTA", "FRENTE_CAJON", "CAJA_CAJON", "MESON", "ZOCALO", "DIVISION", "RIEL",
] as const; // ✅ Usar 'as const' para inferir el tipo literal

// type ComponentTypeValue = typeof COMPONENT_TYPES[number]; // ✅ Tipo inferido automáticamente
// export type SurfaceFinishTypeValue = 
//   | "LACADO" | "CHAPA_MADERA" | "MELAMINA" 
//   | "VINILO_ADHESIVO" | "PINTURA" | "BARNIZ" | "SIN_ACABADO";

interface ComponentTemplate {
  id?: string;
  componentType:ComponentType ;
  label?: string;
  widthFormula: string;
  heightFormula: string;
  depthFormula: string;
  thicknessMM: number;
  quantity: number;
  sortOrder: number;
  topEdge: boolean;
  bottomEdge: boolean;
  leftEdge: boolean;
  rightEdge: boolean;
  defaultMaterialCategory?: MaterialCategory;
  defaultSurfaceFinishType?: SurfaceFinishType;
}
interface ElementType {
  id: string;
  name: string;
  category: string;
  unit: string;
  basePrice: number;
  threeJsModel: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultDepth: number;
  allowCustomWidth: boolean;
  allowCustomHeight: boolean;
  allowCustomDepth: boolean;
  componentTemplates?: ComponentTemplate[];
}
interface ElementTypeForm {
  id?: string;
  name: string;
  category: string;
  unit: string;
  basePrice: number;
  threeJsModel: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultDepth: number;
  allowCustomWidth: boolean;
  allowCustomHeight: boolean;
  allowCustomDepth: boolean;
}
import { useState } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { PlusIcon, PencilIcon, TrashIcon, ChevronDownIcon, ChevronRightIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { getComponentTypeModule } from "next/dist/server/lib/app-dir-module";
// import { serializeDecimals } from "@/server/lib/serialize";

// ─── Tipos de display ─────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  MUEBLE_BAJO: "Muebles bajos", MUEBLE_ALTO: "Muebles altos",
  MESON: "Mesones", ELECTRODOMESTICO: "Electrodomésticos",
  PANEL_YESO: "Panel yeso", SUPERBOARD: "Superboard",
  PUERTA: "Puertas", ESTANTE: "Estantes", OTRO: "Otros",DINAMICO:"Dinamico"
};

const UNIT_LABELS: Record<string, string> = {
  POR_ML: "por ml", POR_M2: "por m²", POR_UNIDAD: "por unidad",
};

const HARDWARE_CATEGORY_LABELS: Record<string, string> = {
  BISAGRA: "Bisagra", RIEL_CAJON: "Riel cajón", JALADOR: "Jalador",
  CORREDERA: "Corredera", PATAS_NIVELADORA: "Patas niveladoras",
  BISAGRA_PIANO: "Bisagra piano", AMORTIGUADOR: "Amortiguador",
  CERRADURA: "Cerradura", CLIP_ESTANTE: "Clip estante", OTRO: "Otro",
};

const TIER_LABELS: Record<string, string> = {
  ECONOMICO: "Económico", ESTANDAR: "Estándar", PREMIUM: "Premium", LUJO: "Lujo",
};

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);
type CatalogTab = "elements" | "materials" | "hardware" | "finishes" | "edges" | "supplies";
// ─── Página principal ─────────────────────────────────────────────────────────

export default function CatalogPage() {
  const [activeTab, setActiveTab] = useState<CatalogTab>("elements");

  const { data: catalog, refetch, isLoading } = api.catalog.getFullCatalog.useQuery();
  // const safeCatalog= serializeDecimals(catalog)

  if (isLoading) return (
    <div className="flex h-screen items-center justify-center text-sm text-gray-400">
      Cargando catálogo...
    </div>
  );

  const tabs = [
    { id: "elements",  label: "Tipos de elemento" },
    { id: "materials", label: "Materiales" },
    { id: "hardware",  label: "Herrajes" },
    { id: "finishes",  label: "Acabados de obra" },
    { id: "edges",     label: "Cantos" },
    { id: "supplies",  label: "Insumos" },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="border-b border-gray-200 bg-white px-8 py-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Catálogo</h1>
            <p className="mt-1 text-sm text-gray-500">Configura los elementos, materiales y precios de tu negocio</p>
          </div>
          <Link href="/dashboard/catalog/import"
            className="flex shrink-0 items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-400 dark:hover:bg-blue-950/50">
            <ArrowDownTrayIcon className="h-4 w-4" />
            Importar del catálogo global
          </Link>
        </div>
      </div>

      <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex overflow-x-auto px-8">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`shrink-0 border-b-2 px-4 py-3 text-sm transition-colors ${
                activeTab === t.id
                  ? "border-gray-900 font-medium text-gray-900 dark:border-gray-100 dark:text-gray-100"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-8">
        {activeTab === "elements"  && <ElementTypesTab  catalog={catalog} onSaved={refetch} />}
        {activeTab === "materials" && <MaterialsTab     catalog={catalog} onSaved={refetch} />}
        {activeTab === "hardware"  && <HardwareTab      catalog={catalog} onSaved={refetch} />}
        {activeTab === "finishes"  && <FinishesTab      catalog={catalog} onSaved={refetch} />}
        {activeTab === "edges"     && <EdgesTab         catalog={catalog} onSaved={refetch} />}
        {activeTab === "supplies"  && <SuppliesTab      catalog={catalog} onSaved={refetch} />}
      </div>
    </div>
  );
}

 
// // ─── Tab: Tipos de elemento ───────────────────────────────────────────────────

function ElementTypesTab({ catalog, onSaved }: { catalog: any; onSaved: () => void }) {
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const upsert = api.catalog.upsertElementType.useMutation({
    onSuccess: () => { setShowForm(false); setEditing(null); onSaved(); },
  });

  const empty = {
    name: "", category: "MUEBLE_BAJO", unit: "POR_ML",
    basePrice: 0, threeJsModel: "LowerCabinet",
    defaultWidth: 60, defaultHeight: 72, defaultDepth: 60,
    allowCustomWidth: true, allowCustomHeight: false, allowCustomDepth: false,
  };
  const [form, setForm] = useState<ElementTypeForm>(empty);

  const openNew  = () => { setForm(empty); setEditing(null); setShowForm(true); };
  const openEdit = (et: any) => {
    setForm({ ...et, basePrice: Number(et.basePrice) });
    setEditing(et);
    setShowForm(true);
  };
const CHECKBOX_FIELDS = [
  { key: "allowCustomWidth", label: "Ancho variable" },
  { key: "allowCustomHeight", label: "Alto variable" },
  { key: "allowCustomDepth", label: "Fondo variable" },
] as const; // TypeScript infers literal types

type CheckboxKey = typeof CHECKBOX_FIELDS[number]["key"];
  const THREE_JS_MODELS = [
    "LowerCabinet", "UpperCabinet", "UpperCabinetGlass",
    "Island", "Appliance", "WallPanel", "CountertopSection","DINAMICO"
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{catalog?.elementTypes?.length ?? 0} tipos configurados</p>
        <button onClick={openNew} className="flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900">
          <PlusIcon className="h-4 w-4" /> Nuevo tipo
        </button>
      </div>

      {/* Formulario de tipo */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-sm font-medium text-gray-900 dark:text-gray-100">
            {editing ? "Editar tipo" : "Nuevo tipo de elemento"}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Mueble bajo estándar" className="input" />
            </Field>
            <Field label="Categoría">
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input">
                {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            {/* <Field label="Unidad de precio">
              <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="input">
                {Object.entries(UNIT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Precio base (COP)">
              <input type="number" value={form.basePrice}
                onChange={e => setForm(f => ({ ...f, basePrice: +e.target.value }))} className="input" />
            </Field> */}
            <Field label="Modelo 3D">
              <select value={form.threeJsModel} onChange={e => setForm(f => ({ ...f, threeJsModel: e.target.value }))} className="input">
                {THREE_JS_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Alto por defecto (cm)">
              <input type="number" value={form.defaultHeight ?? ""}
                onChange={e => setForm(f => ({ ...f, defaultHeight: +e.target.value }))} className="input" />
            </Field>
            <Field label="Ancho por defecto (cm)">
              <input type="number" value={form.defaultWidth ?? ""}
                onChange={e => setForm(f => ({ ...f, defaultWidth: +e.target.value }))} className="input" />
            </Field>
            <Field label="Fondo por defecto (cm)">
              <input type="number" value={form.defaultDepth ?? ""}
                onChange={e => setForm(f => ({ ...f, defaultDepth: +e.target.value }))} className="input" />
            </Field>
          </div>
         <div className="mt-4 flex gap-4">
  {CHECKBOX_FIELDS.map(({ key, label }) => (
    <label key={key} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
      <input
        type="checkbox"
        checked={form[key]} // ✅ TypeScript knows key is a valid key
        onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
      />
      {label}
    </label>
  ))}
</div>
          <div className="mt-5 flex gap-2">
            <button onClick={() => { setShowForm(false); setEditing(null); }}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700">
              Cancelar
            </button>
            <button
              disabled={upsert.isPending || !form.name}
             onClick={() => upsert.mutate({ ...form, 
  id: editing?.id, 
  basePrice: form.basePrice 
} as Parameters<typeof upsert.mutate>[0])}
  className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900">
              {upsert.isPending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}

      {/* Lista de tipos con paneles expandibles */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        {catalog?.elementTypes?.length === 0 && (
          <p className="py-12 text-center text-sm text-gray-400">Sin tipos. Crea el primero o corre el seed.</p>
        )}
        {catalog?.elementTypes?.map((et: any) => (
          <div key={et.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
            {/* Fila principal */}
            <div className="flex items-center justify-between px-5 py-3">
              <button
                className="flex items-center gap-2 flex-1 text-left"
                onClick={() => setExpandedId(expandedId === et.id ? null : et.id)}
              >
                {expandedId === et.id
                  ? <ChevronDownIcon className="h-4 w-4 text-gray-400 shrink-0" />
                  : <ChevronRightIcon className="h-4 w-4 text-gray-400 shrink-0" />
                }
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{et.name}</p>
                  <p className="text-xs text-gray-400">
                    {CATEGORY_LABELS[et.category]} · {COP(Number(et.basePrice))} {UNIT_LABELS[et.unit]} · {et.threeJsModel}
                    <span className="ml-2 text-gray-300 dark:text-gray-600">
                      {et.componentTemplates?.length ?? 0} paneles
                    </span>
                  </p>
                </div>
              </button>
              <button
                onClick={() => openEdit(et)}
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Editor de paneles expandido */}
            {expandedId === et.id && (
              <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-4 dark:border-gray-800 dark:bg-gray-800/30">
                <ComponentTemplatesEditor
                  elementTypeId={et.id}
                  templates={et.componentTemplates ?? []}
                  onSaved={onSaved}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
// // ─── Editor de paneles (ComponentTemplates) ───────────────────────────────────

// // const COMPONENT_TYPES = [
// //   "LATERAL", "FONDO", "TECHO", "PISO", "ENTREPAÑO",
// //   "PUERTA", "FRENTE_CAJON", "CAJA_CAJON", "MESON", "ZOCALO", "DIVISION", "RIEL",
// // ] as const;

const COMPONENT_TYPE_LABELS: Record<string, string> = {
  LATERAL: "Lateral", FONDO: "Fondo", TECHO: "Techo", PISO: "Piso",
  ENTREPAÑO: "Entrepaño", PUERTA: "Puerta", FRENTE_CAJON: "Frente cajón",
  CAJA_CAJON: "Caja cajón", MESON: "Mesón", ZOCALO: "Zócalo",
  DIVISION: "División", RIEL: "Riel",
};

// const MATERIAL_CATEGORIES_SHORT: Record<string, string> = {
//   MADERA_NATURAL: "Madera", MDF_LACADO: "MDF lacado", MELAMINA: "Melamina",
//   GRANITO: "Granito", MARMOL: "Mármol", CUARZO: "Cuarzo",
//   CERAMICA: "Cerámica", PANEL_YESO: "Panel yeso", SUPERBOARD: "Superboard", OTRO: "Otro",
// };

// const SURFACE_FINISH_TYPES: Record<string, string> = {
//   LACADO: "Lacado", CHAPA_MADERA: "Chapa madera", MELAMINA: "Melamina",
//   VINILO_ADHESIVO: "Vinilo", PINTURA: "Pintura", BARNIZ: "Barniz", SIN_ACABADO: "Sin acabado",
// };

// const emptyTemplate = (): ComponentTemplate => ({
//   componentType: "LATERAL",
//   label: "",
//   widthFormula: "D",
//   heightFormula: "H",
//   depthFormula: "D",
//   thicknessMM: 18,
//   quantity: 1,
//   sortOrder: 0,
//   topEdge: false,
//   bottomEdge: false,
//   leftEdge: false,
//   rightEdge: false,
//   defaultMaterialCategory: "MADERA_NATURAL",
//   defaultSurfaceFinishType: "SIN_ACABADO",
// });

// function ComponentTemplatesEditor({
//   elementTypeId,
//   templates,
//   onSaved,
// }: {
//   elementTypeId: string;
//   templates: any[];
//   onSaved: () => void;
// }) {
// const [rows, setRows] = useState<ComponentTemplate[]>(() => 
//   templates.length > 0 
//     ? templates.map((t: any) => ({
//         id: t.id,
//         componentType: t.componentType as ComponentType, // ✅ Type assertion
//         label: t.label ?? "",
//         widthFormula: t.widthFormula,
//         heightFormula: t.heightFormula,
//         depthFormula: t.depthFormula ?? "D",
//         thicknessMM: t.thicknessMM,
//         quantity: t.quantity,
//         sortOrder: t.sortOrder,
//         topEdge: t.topEdge,
//         bottomEdge: t.bottomEdge,
//         leftEdge: t.leftEdge,
//         rightEdge: t.rightEdge,
//         defaultMaterialCategory: t.defaultMaterialCategory as MaterialCategory ?? "MADERA_NATURAL",
//         defaultSurfaceFinishType: t.defaultSurfaceFinishType as SurfaceFinishType ?? "SIN_ACABADO",
//       }))
//     : []
// );

//   const [dirty, setDirty] = useState(false);

//   const save = api.catalog.setComponentTemplates.useMutation({
//     onSuccess: () => { setDirty(false); onSaved(); },
//   });

//   const updateRow = (idx: number, patch: Partial<ComponentTemplate>) => {
//     setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
//     setDirty(true);
//   };

//   const addRow = () => {
//     setRows(prev => [...prev, { ...emptyTemplate(), sortOrder: prev.length }]);
//     setDirty(true);
//   };

//   const removeRow = (idx: number) => {
//     setRows(prev => prev.filter((_, i) => i !== idx));
//     setDirty(true);
//   };

//   const moveRow = (idx: number, dir: -1 | 1) => {
//     const next = idx + dir;
//     if (next < 0 || next >= rows.length) return;
//     const copy = [...rows];
//     [copy[idx], copy[next]] = [copy[next]!, copy[idx]!];
//     setRows(copy.map((r, i) => ({ ...r, sortOrder: i })));
//     setDirty(true);
//   };

//  const handleSave = () => {
//   save.mutate({
//     elementTypeId,
//     templates: rows.map((r, i): ComponentTemplate => ({
//       ...r,
//       sortOrder: i,
//       // Usar ! para asegurar que no es null/undefined, o mantener undefined
//       defaultMaterialCategory: r.defaultMaterialCategory??undefined,
//       defaultSurfaceFinishType: r.defaultSurfaceFinishType ??undefined,
//     })),
//   });
// };

//   return (
//     <div>
//       {/* Header */}
//       <div className="mb-3 flex items-center justify-between">
//         <div>
//           <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Paneles del mueble (BOM)</p>
//           <p className="text-xs text-gray-400 mt-0.5">
//             Fórmulas: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">W</code> = ancho,{" "}
//             <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">H</code> = alto,{" "}
//             <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">D</code> = fondo (en cm). Ej: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">W / 2</code>, <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">H - 3.6</code>
//           </p>
//         </div>
//         <div className="flex gap-2">
//           <button
//             onClick={addRow}
//             className="flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-white dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
//           >
//             <PlusIcon className="h-3.5 w-3.5" /> Agregar panel
//           </button>
//           {dirty && (
//             <button
//               onClick={handleSave}
//               disabled={save.isPending}
//               className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
//             >
//               {save.isPending ? "Guardando..." : "Guardar paneles"}
//             </button>
//           )}
//         </div>
//       </div>

//       {rows.length === 0 && (
//         <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center dark:border-gray-700">
//           <p className="text-sm text-gray-400">Sin paneles definidos</p>
//           <p className="mt-1 text-xs text-gray-300 dark:text-gray-600">
//             El BOM se instanciará vacío al agregar este elemento a una cotización
//           </p>
//         </div>
//       )}

//       {rows.length > 0 && (
//         <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
//           <table className="w-full text-xs">
//             <thead>
//               <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
//                 {[
//                   "Orden", "Tipo", "Etiqueta", "Ancho (fórmula)", "Alto (fórmula)",
//                   "Fondo (fórmula)", "Esp. (mm)", "Cant.", "Cantos visibles",
//                   "Material default", "Acabado default", "",
//                 ].map(h => (
//                   <th key={h} className="px-2 py-2 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
//                     {h}
//                   </th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {rows.map((row, idx) => (
//                 <tr key={idx} className="border-b border-gray-100 last:border-0 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800/20">
//                   {/* Orden */}
//                   <td className="px-2 py-1.5">
//                     <div className="flex flex-col gap-0.5">
//                       <button onClick={() => moveRow(idx, -1)} disabled={idx === 0}
//                         className="text-gray-300 hover:text-gray-600 disabled:opacity-20 dark:text-gray-600">▲</button>
//                       <button onClick={() => moveRow(idx, 1)} disabled={idx === rows.length - 1}
//                         className="text-gray-300 hover:text-gray-600 disabled:opacity-20 dark:text-gray-600">▼</button>
//                     </div>
//                   </td>

//                   {/* Tipo */}
//                   <td className="px-2 py-1.5">
//                     <select
//                       value={row.componentType}
//                       onChange={e => updateRow(idx, { componentType: e.target.value as ComponentType })}
//                       className="rounded border border-gray-200 bg-white px-1.5 py-1 text-xs text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
//                     >
//                       {COMPONENT_TYPES.map(t => (
//                         <option key={t} value={t}>{COMPONENT_TYPE_LABELS[t]}</option>
//                       ))}
//                     </select>
//                   </td>

//                   {/* Etiqueta */}
//                   <td className="px-2 py-1.5">
//                     <input
//                       value={row.label}
//                       onChange={e => updateRow(idx, { label: e.target.value })}
//                       placeholder="Ej: Lateral izq."
//                       className="w-28 rounded border border-gray-200 bg-white px-1.5 py-1 text-xs focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
//                     />
//                   </td>

//                   {/* Fórmulas */}
//                   {(["widthFormula", "heightFormula", "depthFormula"] as const).map(field => (
//                     <td key={field} className="px-2 py-1.5">
//                       <input
//                         value={row[field]}
//                         onChange={e => updateRow(idx, { [field]: e.target.value })}
//                         placeholder="W"
//                         className="w-20 rounded border border-gray-200 bg-white px-1.5 py-1 font-mono text-xs focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
//                       />
//                     </td>
//                   ))}

//                   {/* Espesor */}
//                   <td className="px-2 py-1.5">
//                     <input
//                       type="number"
//                       value={row.thicknessMM}
//                       onChange={e => updateRow(idx, { thicknessMM: +e.target.value })}
//                       className="w-14 rounded border border-gray-200 bg-white px-1.5 py-1 text-xs focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
//                     />
//                   </td>

//                   {/* Cantidad */}
//                   <td className="px-2 py-1.5">
//                     <input
//                       type="number"
//                       min={1}
//                       value={row.quantity}
//                       onChange={e => updateRow(idx, { quantity: +e.target.value })}
//                       className="w-12 rounded border border-gray-200 bg-white px-1.5 py-1 text-xs focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
//                     />
//                   </td>

//                   {/* Cantos visibles */}
//                   <td className="px-2 py-1.5">
//                     <div className="flex flex-col gap-1">
//                       <div className="flex gap-2">
//                         {(["topEdge", "bottomEdge", "leftEdge", "rightEdge"] as const).map(edge => (
//                           <label key={edge} className="flex items-center gap-1 cursor-pointer" title={
//                             edge === "topEdge" ? "Superior" : edge === "bottomEdge" ? "Inferior" :
//                             edge === "leftEdge" ? "Izquierdo" : "Derecho"
//                           }>
//                             <input
//                               type="checkbox"
//                               checked={row[edge]}
//                               onChange={e => updateRow(idx, { [edge]: e.target.checked })}
//                               className="h-3 w-3"
//                             />
//                             <span className="text-gray-500 dark:text-gray-400">
//                               {edge === "topEdge" ? "↑" : edge === "bottomEdge" ? "↓" :
//                                edge === "leftEdge" ? "←" : "→"}
//                             </span>
//                           </label>
//                         ))}
//                       </div>
//                     </div>
//                   </td>

//                   {/* Material default */}
//                   <td className="px-2 py-1.5">
//                     <select
//                       value={row.defaultMaterialCategory}
//                       onChange={e => updateRow(idx, { defaultMaterialCategory: e.target.value as MaterialCategory })}
//                       className="rounded border border-gray-200 bg-white px-1.5 py-1 text-xs text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
//                     >
//                       <option value="">— Cualquiera —</option>
//                       {Object.entries(MATERIAL_CATEGORIES_SHORT).map(([v, l]) => (
//                         <option key={v} value={v}>{l}</option>
//                       ))}
//                     </select>
//                   </td>

//                   {/* Acabado default */}
//                   <td className="px-2 py-1.5">
//                     <select
//                       value={row.defaultSurfaceFinishType}
//                       onChange={e => updateRow(idx, { defaultSurfaceFinishType: e.target.value as SurfaceFinishType})}
//                       className="rounded border border-gray-200 bg-white px-1.5 py-1 text-xs text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
//                     >
//                       <option value="">— Ninguno —</option>
//                       {Object.entries(SURFACE_FINISH_TYPES).map(([v, l]) => (
//                         <option key={v} value={v}>{l}</option>
//                       ))}
//                     </select>
//                   </td>

//                   {/* Eliminar */}
//                   <td className="px-2 py-1.5">
//                     <button
//                       onClick={() => removeRow(idx)}
//                       className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500 dark:text-gray-600 dark:hover:bg-red-950 dark:hover:text-red-400"
//                     >
//                       <TrashIcon className="h-3.5 w-3.5" />
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}

//       {/* Preview de lo que produce la fórmula con dimensiones de ejemplo */}
//       {rows.length > 0 && (
//         <FormulaPreview rows={rows} />
//       )}

//       {/* Botón de guardar abajo también para tablas largas */}
//       {dirty && rows.length > 4 && (
//         <div className="mt-3 flex justify-end">
//           <button
//             onClick={handleSave}
//             disabled={save.isPending}
//             className="rounded-md bg-gray-900 px-4 py-2 text-xs font-medium text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
//           >
//             {save.isPending ? "Guardando..." : "Guardar paneles"}
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }

// ─── Preview de fórmulas ──────────────────────────────────────────────────────

function FormulaPreview({ rows }: { rows: ComponentTemplate[] }) {
  const [W, setW] = useState(60);
  const [H, setH] = useState(72);
  const [D, setD] = useState(60);

  const evalF = (formula: string): string => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const result = Function(`"use strict"; const W=${W}, H=${H}, D=${D}; return (${formula})`)() as number;
      return result.toFixed(1);
    } catch {
      return "—";
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-3 flex items-center gap-4">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Preview con dimensiones:</p>
        {[
          { label: "W", value: W, set: setW },
          { label: "H", value: H, set: setH },
          { label: "D", value: D, set: setD },
        ].map(({ label, value, set }) => (
          <label key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="font-mono font-medium">{label}</span>
            <input
              type="number"
              value={value}
              onChange={e => set(+e.target.value)}
              className="w-14 rounded border border-gray-200 px-1.5 py-1 text-xs focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
            <span>cm</span>
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {rows.map((row, idx) => {
          const w = evalF(row.widthFormula);
          const h = evalF(row.heightFormula);
          const d = evalF(row.depthFormula);
          const area = !isNaN(+w) && !isNaN(+h) ? ((+w * +h * row.quantity) / 10000).toFixed(3) : "—";
          return (
            <div key={idx} className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/50">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {COMPONENT_TYPE_LABELS[row.componentType]}
                {row.label && <span className="ml-1 text-gray-400">({row.label})</span>}
                {row.quantity > 1 && <span className="ml-1 text-gray-400">×{row.quantity}</span>}
              </p>
              <p className="mt-0.5 font-mono text-xs text-gray-500">
                {w} × {h} × {row.thicknessMM}mm
              </p>
              <p className="text-xs text-gray-400">{area} m²</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab: Materiales ──────────────────────────────────────────────────────────

interface MaterialForm {
  name: string;
  category: string;
  pricePerM2: number;
  thicknessMM: number;
  color: string;
  aiDescription: string;
}
function MaterialsTab({ catalog, onSaved }: { catalog:any, onSaved: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<any>(null);
  const upsert = api.catalog.upsertMaterial.useMutation({
    onSuccess: () => { setShowForm(false); setEditing(null); onSaved(); },
  });

  const MATERIAL_CATEGORIES: Record<string, string> = {
    MADERA_NATURAL: "Madera natural", MDF_LACADO: "MDF lacado",
    MELAMINA: "Melamina", GRANITO: "Granito", MARMOL: "Mármol",
    CUARZO: "Cuarzo", CERAMICA: "Cerámica",
    PANEL_YESO: "Panel yeso", SUPERBOARD: "Superboard", OTRO: "Otro",
  };

  const empty = { name: "", category: "MDF_LACADO", pricePerM2: 0, thicknessMM: 18, color: "#d8d0c4", aiDescription: "" };
  const [form, setForm] = useState<MaterialForm>(empty);

  const openNew  = () => { setForm(empty); setEditing(null); setShowForm(true); };
  const openEdit = (m: any) => { setForm({ ...m, pricePerM2: Number(m.pricePerM2) }); setEditing(m); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{catalog?.materials?.length ?? 0} materiales</p>
        <button onClick={openNew} className="flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900">
          <PlusIcon className="h-4 w-4" /> Nuevo material
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-sm font-medium text-gray-900 dark:text-gray-100">
            {editing ? "Editar material" : "Nuevo material"}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" placeholder="Ej: MDF 18mm blanco" />
            </Field>
            <Field label="Categoría">
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input">
                {Object.entries(MATERIAL_CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Precio por m² (COP)">
              <input type="number" value={form.pricePerM2} onChange={e => setForm(f => ({ ...f, pricePerM2: +e.target.value }))} className="input" />
            </Field>
            <Field label="Espesor (mm)">
              <input type="number" value={form.thicknessMM} onChange={e => setForm(f => ({ ...f, thicknessMM: +e.target.value }))} className="input" />
            </Field>
            <Field label="Color hex">
              <div className="flex gap-2">
                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  className="h-9 w-12 cursor-pointer rounded border border-gray-200 p-0.5" />
                <input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="input flex-1" placeholder="#d8d0c4" />
              </div>
            </Field>
            <Field label="Descripción para IA">
              <input value={form.aiDescription} onChange={e => setForm(f => ({ ...f, aiDescription: e.target.value }))}
                className="input" placeholder="white lacquered MDF, smooth finish" />
            </Field>
          </div>
          <div className="mt-5 flex gap-2">
            <button onClick={() => { setShowForm(false); setEditing(null); }}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700">
              Cancelar
            </button>
            <button
              disabled={upsert.isPending || !form.name}
              onClick={() => upsert.mutate({ ...form, id: editing?.id } as any)}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900">
              {upsert.isPending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        {catalog?.materials?.map((m: any) => (
          <div key={m.id} className="flex items-center gap-3 border-b border-gray-100 px-5 py-3 last:border-0 dark:border-gray-800">
            <div className="h-6 w-6 shrink-0 rounded border border-gray-200" style={{ background: m.color ?? "#eee" }} />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{m.name}</p>
              <p className="text-xs text-gray-400">{MATERIAL_CATEGORIES[m.category]} · {m.thicknessMM}mm · {COP(Number(m.pricePerM2))}/m²</p>
            </div>
            <button onClick={() => openEdit(m)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              <PencilIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
        {catalog?.materials?.length === 0 && (
          <p className="py-12 text-center text-sm text-gray-400">Sin materiales configurados</p>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Herrajes ────────────────────────────────────────────────────────────

function HardwareTab({ catalog, onSaved }: { catalog: any; onSaved: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<any>(null);
  const upsert = api.catalog.upsertHardware.useMutation({
    onSuccess: () => { setShowForm(false); setEditing(null); onSaved(); },
  });

  const empty = { name: "", category: "BISAGRA", qualityTier: "ESTANDAR", brand: "", pricePerUnit: 0, unit: "und", description: "" };
  const [form, setForm] = useState(empty);

  const openNew  = () => { setForm(empty); setEditing(null); setShowForm(true); };
  const openEdit = (h: any) => { setForm({ ...h, pricePerUnit: Number(h.pricePerUnit) }); setEditing(h); setShowForm(true); };

  const TIER_COLORS: Record<string, string> = {
    ECONOMICO: "bg-gray-100 text-gray-600", ESTANDAR: "bg-blue-50 text-blue-700",
    PREMIUM: "bg-purple-50 text-purple-700", LUJO: "bg-amber-50 text-amber-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{catalog?.hardware?.length ?? 0} herrajes</p>
        <button onClick={openNew} className="flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900">
          <PlusIcon className="h-4 w-4" /> Nuevo herraje
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-sm font-medium text-gray-900 dark:text-gray-100">{editing ? "Editar herraje" : "Nuevo herraje"}</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" placeholder="Ej: Bisagra hidráulica Blum" />
            </Field>
            <Field label="Marca">
              <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} className="input" placeholder="Blum, Hettich, Grass..." />
            </Field>
            <Field label="Categoría">
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input">
                {Object.entries(HARDWARE_CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Tier de calidad">
              <select value={form.qualityTier} onChange={e => setForm(f => ({ ...f, qualityTier: e.target.value }))} className="input">
                {Object.entries(TIER_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Precio por unidad (COP)">
              <input type="number" value={form.pricePerUnit} onChange={e => setForm(f => ({ ...f, pricePerUnit: +e.target.value }))} className="input" />
            </Field>
            <Field label="Unidad">
              <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="input">
                {["und", "par", "juego", "ml"].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
            <Field label="Descripción" className="col-span-2">
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input" placeholder="Descripción opcional" />
            </Field>
          </div>
          <div className="mt-5 flex gap-2">
            <button onClick={() => { setShowForm(false); setEditing(null); }}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700">Cancelar</button>
            <button
              disabled={upsert.isPending || !form.name}
             onClick={() => upsert.mutate({ ...form, id: editing?.id } as any)}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900">
              {upsert.isPending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        {catalog?.hardware?.map((h: any) => (
          <div key={h.id} className="flex items-center justify-between border-b border-gray-100 px-5 py-3 last:border-0 dark:border-gray-800">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{h.name}</p>
                <span className={`rounded px-1.5 py-0.5 text-xs ${TIER_COLORS[h.qualityTier]}`}>{TIER_LABELS[h.qualityTier]}</span>
              </div>
              <p className="text-xs text-gray-400">{HARDWARE_CATEGORY_LABELS[h.category]} · {h.brand} · {COP(Number(h.pricePerUnit))}/{h.unit}</p>
            </div>
            <button onClick={() => openEdit(h)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              <PencilIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
        {catalog?.hardware?.length === 0 && (
          <p className="py-12 text-center text-sm text-gray-400">Sin herrajes configurados</p>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Acabados de obra ────────────────────────────────────────────────────

function FinishesTab({ catalog, onSaved }: { catalog: any; onSaved: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<any>(null);
  const upsert = api.catalog.upsertAssemblySupply.useMutation(); // reuses pattern

  // Uses a dedicated finish upsert — we need to add it
  const upsertFinish = api.catalog.upsertFinish.useMutation({
    onSuccess: () => { setShowForm(false); setEditing(null); onSaved(); },
  });

  const empty = { name: "", pricePerM2: 0, unit: "m²" };
  const [form, setForm] = useState(empty);

  const openNew  = () => { setForm(empty); setEditing(null); setShowForm(true); };
  const openEdit = (f: any) => { setForm({ ...f, pricePerM2: Number(f.pricePerM2) }); setEditing(f); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{catalog?.finishes?.length ?? 0} acabados de obra</p>
        <button onClick={openNew} className="flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900">
          <PlusIcon className="h-4 w-4" /> Nuevo acabado
        </button>
      </div>
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Nombre" className="col-span-2">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" placeholder="Ej: Estucado y pintura" />
            </Field>
            <Field label="Precio/m² (COP)">
              <input type="number" value={form.pricePerM2} onChange={e => setForm(f => ({ ...f, pricePerM2: +e.target.value }))} className="input" />
            </Field>
          </div>
          <div className="mt-5 flex gap-2">
            <button onClick={() => { setShowForm(false); setEditing(null); }}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700">Cancelar</button>
            <button
              disabled={upsertFinish.isPending || !form.name}
              onClick={() => upsertFinish.mutate({ ...form, id: editing?.id })}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900">
              {upsertFinish.isPending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        {catalog?.finishes?.map((f: any) => (
          <div key={f.id} className="flex items-center justify-between border-b border-gray-100 px-5 py-3 last:border-0 dark:border-gray-800">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{f.name}</p>
              <p className="text-xs text-gray-400">{COP(Number(f.pricePerM2))}/{f.unit}</p>
            </div>
            <button onClick={() => openEdit(f)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              <PencilIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
        {catalog?.finishes?.length === 0 && <p className="py-12 text-center text-sm text-gray-400">Sin acabados configurados</p>}
      </div>
    </div>
  );
}

// ─── Tab: Cantos ──────────────────────────────────────────────────────────────

function EdgesTab({ catalog, onSaved }: { catalog: any; onSaved: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<any>(null);
  const upsert = api.catalog.upsertEdgeTreatment.useMutation({
    onSuccess: () => { setShowForm(false); setEditing(null); onSaved(); },
  });

  const EDGE_TYPES: Record<string, string> = {
    CANTO_MELAMINA: "Canto melamina", CANTO_PVC: "Canto PVC",
    PERFIL_ALUMINIO: "Perfil aluminio", CHAFLAN_45: "Chaflan 45°",
    MEDIA_CANNA: "Media caña", MOLDURA: "Moldura",
    POSTFORMADO: "Postformado", SIN_CANTO: "Sin canto",
  };

  const empty = { name: "", type: "CANTO_PVC", pricePerML: 0 };
  const [form, setForm] = useState(empty);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{catalog?.edgeTreatments?.length ?? 0} tipos de canto</p>
        <button onClick={() => { setForm(empty); setEditing(null); setShowForm(true); }}
          className="flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900">
          <PlusIcon className="h-4 w-4" /> Nuevo canto
        </button>
      </div>
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Nombre" className="col-span-1">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" placeholder="Ej: Canto PVC 2mm blanco" />
            </Field>
            <Field label="Tipo">
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input">
                {Object.entries(EDGE_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Precio/ml (COP)">
              <input type="number" value={form.pricePerML} onChange={e => setForm(f => ({ ...f, pricePerML: +e.target.value }))} className="input" />
            </Field>
          </div>
          <div className="mt-5 flex gap-2">
            <button onClick={() => setShowForm(false)}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700">Cancelar</button>
            <button
              disabled={upsert.isPending || !form.name}
             onClick={() => upsert.mutate({ ...form, id: editing?.id } as any)}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900">
              {upsert.isPending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        {catalog?.edgeTreatments?.map((e: any) => (
          <div key={e.id} className="flex items-center justify-between border-b border-gray-100 px-5 py-3 last:border-0 dark:border-gray-800">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{e.name}</p>
              <p className="text-xs text-gray-400">{EDGE_TYPES[e.type]} · {COP(Number(e.pricePerML))}/ml</p>
            </div>
            <button onClick={() => { setForm({ ...e, pricePerML: Number(e.pricePerML) }); setEditing(e); setShowForm(true); }}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              <PencilIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
        {catalog?.edgeTreatments?.length === 0 && <p className="py-12 text-center text-sm text-gray-400">Sin cantos configurados</p>}
      </div>
    </div>
  );
}

// ─── Tab: Insumos ─────────────────────────────────────────────────────────────

function SuppliesTab({ catalog, onSaved }: { catalog: any; onSaved: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<any>(null);
  const upsert = api.catalog.upsertAssemblySupply.useMutation({
    onSuccess: () => { setShowForm(false); setEditing(null); onSaved(); },
  });

  const SUPPLY_CATEGORIES: Record<string, string> = {
    TORNILLO: "Tornillo", TARUGO: "Tarugo", PEGANTE: "Pegante",
    SEPARADOR: "Separador", ANCLAJE: "Anclaje",
    PERFIL_UNION: "Perfil unión", MECANIZADO: "Mecanizado", OTRO: "Otro",
  };

  const empty = { name: "", category: "TORNILLO", unit: "und", pricePerUnit: 0, autoCalcRule: "" };
  const [form, setForm] = useState(empty);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{catalog?.assemblySupplies?.length ?? 0} insumos</p>
        <button onClick={() => { setForm(empty); setEditing(null); setShowForm(true); }}
          className="flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900">
          <PlusIcon className="h-4 w-4" /> Nuevo insumo
        </button>
      </div>
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" placeholder="Ej: Tornillo Confirmat 7×50" />
            </Field>
            <Field label="Categoría">
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input">
                {Object.entries(SUPPLY_CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Precio/unidad (COP)">
              <input type="number" value={form.pricePerUnit} onChange={e => setForm(f => ({ ...f, pricePerUnit: +e.target.value }))} className="input" />
            </Field>
            <Field label="Unidad">
              <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="input">
                {["und", "ml", "kg", "m", "litro"].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
            <Field label="Regla automática" className="col-span-2">
              <input value={form.autoCalcRule} onChange={e => setForm(f => ({ ...f, autoCalcRule: e.target.value }))}
                className="input" placeholder="Ej: 8_PER_PANEL · 0.15L_PER_M2 (vacío = manual)" />
            </Field>
          </div>
          <div className="mt-5 flex gap-2">
            <button onClick={() => setShowForm(false)}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700">Cancelar</button>
            <button
              disabled={upsert.isPending || !form.name}
             onClick={() => upsert.mutate({ ...form, id: editing?.id } as any)}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900">
              {upsert.isPending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        {catalog?.assemblySupplies?.map((s: any) => (
          <div key={s.id} className="flex items-center justify-between border-b border-gray-100 px-5 py-3 last:border-0 dark:border-gray-800">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{s.name}</p>
              <p className="text-xs text-gray-400">
                {SUPPLY_CATEGORIES[s.category]} · {COP(Number(s.pricePerUnit))}/{s.unit}
                {s.autoCalcRule && <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">auto: {s.autoCalcRule}</span>}
              </p>
            </div>
            <button onClick={() => { setForm({ ...s, pricePerUnit: Number(s.pricePerUnit) }); setEditing(s); setShowForm(true); }}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              <PencilIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
        {catalog?.assemblySupplies?.length === 0 && <p className="py-12 text-center text-sm text-gray-400">Sin insumos configurados</p>}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{label}</label>
      {children}
    </div>
  );
}