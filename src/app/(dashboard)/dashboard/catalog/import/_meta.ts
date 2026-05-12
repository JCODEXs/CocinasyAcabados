// src/app/(dashboard)/dashboard/catalog/import/_meta.ts
//
// Etiquetas y formateadores para los items del catálogo global.
// Mantenido aparte para que page.tsx quede legible.

import type { ImportableEntity } from "@/server/services/catalog-import.service";

export const ENTITY_TABS: { id: ImportableEntity; label: string }[] = [
  { id: "elementType",    label: "Tipos de elemento" },
  { id: "material",       label: "Materiales" },
  { id: "hardware",       label: "Herrajes" },
  { id: "finish",         label: "Acabados de obra" },
  { id: "edgeTreatment",  label: "Cantos" },
  { id: "assemblySupply", label: "Insumos" },
];

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", minimumFractionDigits: 0,
  }).format(n);

const CATEGORY_LABELS: Record<string, string> = {
  MUEBLE_BAJO: "Muebles bajos", MUEBLE_ALTO: "Muebles altos",
  MESON: "Mesones", ELECTRODOMESTICO: "Electrodomésticos",
  PANEL_YESO: "Panel yeso", SUPERBOARD: "Superboard",
  PUERTA: "Puertas", ESTANTE: "Estantes", OTRO: "Otros",
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

const MATERIAL_CATEGORIES: Record<string, string> = {
  MADERA_NATURAL: "Madera natural", MDF_LACADO: "MDF lacado",
  MELAMINA: "Melamina", GRANITO: "Granito", MARMOL: "Mármol",
  CUARZO: "Cuarzo", CERAMICA: "Cerámica", PANEL_YESO: "Panel yeso",
  SUPERBOARD: "Superboard", OTRO: "Otro",
};

const EDGE_LABELS: Record<string, string> = {
  CANTO_MELAMINA: "Canto melamina", CANTO_PVC: "Canto PVC",
  PERFIL_ALUMINIO: "Perfil aluminio", CHAFLAN_45: "Chaflán 45°",
  MEDIA_CANNA: "Media caña", MOLDURA: "Moldura",
  POSTFORMADO: "Postformado", SIN_CANTO: "Sin canto",
};

const SUPPLY_LABELS: Record<string, string> = {
  TORNILLO: "Tornillo", TARUGO: "Tarugo", PEGANTE: "Pegante",
  SEPARADOR: "Separador", ANCLAJE: "Anclaje", PERFIL_UNION: "Perfil unión",
  MECANIZADO: "Mecanizado", OTRO: "Otro",
};

// Devuelve una línea descriptiva por item según la entidad.
export function describeItem(entity: ImportableEntity, item: Record<string, unknown>): string {
  const num = (v: unknown) => Number(v ?? 0);
  switch (entity) {
    case "elementType": {
      const cat = CATEGORY_LABELS[item.category as string] ?? String(item.category);
      const unit = UNIT_LABELS[item.unit as string] ?? "";
      const tpls = (item.componentTemplates as unknown[] | undefined)?.length ?? 0;
      return `${cat} · ${COP(num(item.basePrice))} ${unit} · ${tpls} paneles`;
    }
    case "material": {
      const cat = MATERIAL_CATEGORIES[item.category as string] ?? String(item.category);
      return `${cat} · ${item.thicknessMM ?? "—"}mm · ${COP(num(item.pricePerM2))}/m²`;
    }
    case "hardware": {
      const cat = HARDWARE_CATEGORY_LABELS[item.category as string] ?? String(item.category);
      const tier = TIER_LABELS[item.qualityTier as string] ?? String(item.qualityTier);
      return `${cat} · ${tier}${item.brand ? ` · ${item.brand as string}` : ""} · ${COP(num(item.pricePerUnit))}/${item.unit ?? "und"}`;
    }
    case "finish":
      return `${COP(num(item.pricePerM2))}/${item.unit ?? "m²"}`;
    case "edgeTreatment": {
      const t = EDGE_LABELS[item.type as string] ?? String(item.type);
      return `${t} · ${item.thicknessMM ?? "—"}mm · ${COP(num(item.pricePerML))}/ml`;
    }
    case "assemblySupply": {
      const cat = SUPPLY_LABELS[item.category as string] ?? String(item.category);
      return `${cat} · ${COP(num(item.pricePerUnit))}/${item.unit ?? "und"}`;
    }
  }
}

export function getColor(entity: ImportableEntity, item: Record<string, unknown>): string | undefined {
  if (entity === "material") return (item.color as string) || undefined;
  return undefined;
}
