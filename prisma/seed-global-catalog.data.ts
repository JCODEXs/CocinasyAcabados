// prisma/seed-global-catalog.data.ts
//
// Datos puros (sin acceso a DB) para el catálogo global. Mantenido en archivo
// aparte para que seed-global-catalog.ts quede legible.

import type {
  ElementCategory, PricingUnit, ComponentType,
  MaterialCategory, SurfaceFinishType,
} from "@prisma/client";

// ─── Element types ──────────────────────────────────────────────────────────

type ElementTypeSeed = {
  id: string;
  name: string;
  category: ElementCategory;
  unit: PricingUnit;
  basePrice: number;
  defaultWidth?: number;
  defaultHeight?: number;
  defaultDepth?: number;
  threeJsModel: string;
  allowCustomWidth?: boolean;
  allowCustomHeight?: boolean;
  allowCustomDepth?: boolean;
};

export const ELEMENT_TYPES: ElementTypeSeed[] = [
  { id: "tpl-et-mueble-bajo",   name: "Mueble bajo estándar",       category: "MUEBLE_BAJO",      unit: "POR_UNIDAD", basePrice: 350000, defaultWidth: 60,  defaultHeight: 72,  defaultDepth: 60, threeJsModel: "LowerCabinet",      allowCustomWidth: true, allowCustomHeight: false, allowCustomDepth: false },
  { id: "tpl-et-mueble-alto",   name: "Mueble alto estándar",       category: "MUEBLE_ALTO",      unit: "POR_UNIDAD", basePrice: 280000, defaultWidth: 60,  defaultHeight: 80,  defaultDepth: 35, threeJsModel: "UpperCabinet",      allowCustomWidth: true, allowCustomHeight: false, allowCustomDepth: false },
  { id: "tpl-et-isla",          name: "Isla central",               category: "MUEBLE_BAJO",      unit: "POR_UNIDAD", basePrice: 850000, defaultWidth: 120, defaultHeight: 90,  defaultDepth: 90, threeJsModel: "Island",            allowCustomWidth: true, allowCustomHeight: false, allowCustomDepth: true  },
  { id: "tpl-et-refrigerador",  name: "Módulo refrigerador",        category: "ELECTRODOMESTICO", unit: "POR_UNIDAD", basePrice: 0,      defaultWidth: 70,  defaultHeight: 180, defaultDepth: 70, threeJsModel: "Appliance",         allowCustomWidth: false, allowCustomHeight: false, allowCustomDepth: false },
  { id: "tpl-et-horno",         name: "Módulo horno empotrado",     category: "ELECTRODOMESTICO", unit: "POR_UNIDAD", basePrice: 0,      defaultWidth: 60,  defaultHeight: 60,  defaultDepth: 55, threeJsModel: "Appliance",         allowCustomWidth: false, allowCustomHeight: false, allowCustomDepth: false },
  { id: "tpl-et-meson",         name: "Mesón corrido",              category: "MESON",            unit: "POR_ML",     basePrice: 180000, defaultWidth: 100, defaultHeight: 4,   defaultDepth: 62, threeJsModel: "CountertopSection", allowCustomWidth: true, allowCustomHeight: false, allowCustomDepth: false },
  { id: "tpl-et-panel-yeso",    name: "Panel yeso Drywall",         category: "PANEL_YESO",       unit: "POR_M2",     basePrice: 45000,  defaultWidth: 120, defaultHeight: 240, defaultDepth: 10, threeJsModel: "WallPanel",         allowCustomWidth: true, allowCustomHeight: true,  allowCustomDepth: false },
];

// ─── Component templates por element type ───────────────────────────────────

type CompTpl = {
  componentType: ComponentType;
  label?: string;
  widthFormula: string;
  heightFormula: string;
  depthFormula?: string;
  thicknessMM: number;
  quantity: number;
  sortOrder: number;
  topEdge?: boolean;
  bottomEdge?: boolean;
  leftEdge?: boolean;
  rightEdge?: boolean;
  defaultMaterialCategory?: MaterialCategory;
  defaultSurfaceFinishType?: SurfaceFinishType;
};

export const COMPONENT_TEMPLATES_BY_ET: Record<string, CompTpl[]> = {
  // Mueble bajo
  "tpl-et-mueble-bajo": [
    { componentType: "LATERAL", label: "Lateral izquierdo", widthFormula: "D",      heightFormula: "H - 8",  depthFormula: "D", thicknessMM: 18, quantity: 1, sortOrder: 0, leftEdge: true },
    { componentType: "LATERAL", label: "Lateral derecho",   widthFormula: "D",      heightFormula: "H - 8",  depthFormula: "D", thicknessMM: 18, quantity: 1, sortOrder: 1, rightEdge: true },
    { componentType: "FONDO",   label: "Fondo",             widthFormula: "W - 3.6",heightFormula: "H - 8",  depthFormula: "D", thicknessMM: 9,  quantity: 1, sortOrder: 2 },
    { componentType: "PISO",    label: "Piso",              widthFormula: "W - 3.6",heightFormula: "D",      depthFormula: "D", thicknessMM: 18, quantity: 1, sortOrder: 3 },
    { componentType: "TECHO",   label: "Techo interno",     widthFormula: "W - 3.6",heightFormula: "D",      depthFormula: "D", thicknessMM: 18, quantity: 1, sortOrder: 4 },
    { componentType: "PUERTA",  label: "Puerta",            widthFormula: "W / 2",  heightFormula: "H - 11", depthFormula: "D", thicknessMM: 18, quantity: 2, sortOrder: 5, topEdge: true, bottomEdge: true, leftEdge: true, rightEdge: true, defaultSurfaceFinishType: "LACADO" },
    { componentType: "MESON",   label: "Mesón",             widthFormula: "W + 2",  heightFormula: "D + 4",  depthFormula: "D", thicknessMM: 20, quantity: 1, sortOrder: 6, defaultMaterialCategory: "GRANITO" },
  ],
  // Mueble alto
  "tpl-et-mueble-alto": [
    { componentType: "LATERAL",   label: "Lateral izquierdo", widthFormula: "D",      heightFormula: "H",       depthFormula: "D", thicknessMM: 18, quantity: 1, sortOrder: 0, leftEdge: true },
    { componentType: "LATERAL",   label: "Lateral derecho",   widthFormula: "D",      heightFormula: "H",       depthFormula: "D", thicknessMM: 18, quantity: 1, sortOrder: 1, rightEdge: true },
    { componentType: "FONDO",     label: "Fondo",             widthFormula: "W - 3.6",heightFormula: "H",       depthFormula: "D", thicknessMM: 9,  quantity: 1, sortOrder: 2 },
    { componentType: "TECHO",     label: "Techo",             widthFormula: "W - 3.6",heightFormula: "D",       depthFormula: "D", thicknessMM: 18, quantity: 1, sortOrder: 3 },
    { componentType: "PISO",      label: "Piso interno",      widthFormula: "W - 3.6",heightFormula: "D",       depthFormula: "D", thicknessMM: 18, quantity: 1, sortOrder: 4 },
    { componentType: "ENTREPAÑO", label: "Entrepaño",         widthFormula: "W - 3.6",heightFormula: "D - 2",   depthFormula: "D", thicknessMM: 18, quantity: 1, sortOrder: 5 },
    { componentType: "PUERTA",    label: "Puerta",            widthFormula: "W - 1.8",heightFormula: "H - 1.8", depthFormula: "D", thicknessMM: 18, quantity: 1, sortOrder: 6, topEdge: true, bottomEdge: true, leftEdge: true, rightEdge: true, defaultSurfaceFinishType: "LACADO" },
  ],
  // Isla
  "tpl-et-isla": [
    { componentType: "LATERAL",    label: "Frente decorativo", widthFormula: "D",      heightFormula: "H",     depthFormula: "D",     thicknessMM: 18, quantity: 1, sortOrder: 0, topEdge: true, leftEdge: true, rightEdge: true, defaultSurfaceFinishType: "LACADO", defaultMaterialCategory: "MDF_LACADO" },
    { componentType: "LATERAL",    label: "Posterior",         widthFormula: "D",      heightFormula: "H",     depthFormula: "D",     thicknessMM: 18, quantity: 1, sortOrder: 1, defaultMaterialCategory: "MELAMINA" },
    { componentType: "PISO",       label: "Base inferior",     widthFormula: "W - 3.6",heightFormula: "D - 3.6",depthFormula: "D",     thicknessMM: 18, quantity: 1, sortOrder: 2 },
    { componentType: "TECHO",      label: "Cubierta superior", widthFormula: "W + 4",  heightFormula: "D + 4", depthFormula: "D",     thicknessMM: 20, quantity: 1, sortOrder: 3, defaultMaterialCategory: "GRANITO" },
    { componentType: "ZOCALO",     label: "Zócalo",            widthFormula: "W",      heightFormula: "10",    depthFormula: "D",     thicknessMM: 18, quantity: 1, sortOrder: 4, topEdge: true, bottomEdge: true },
    { componentType: "CAJA_CAJON", label: "Cajón (x2)",        widthFormula: "(W / 2) - 5", heightFormula: "20",depthFormula: "D - 10",thicknessMM: 15, quantity: 2, sortOrder: 5, defaultMaterialCategory: "MELAMINA" },
  ],
  // Mesón corrido
  "tpl-et-meson": [
    { componentType: "MESON",    label: "Plancha de mesón",     widthFormula: "W",      heightFormula: "D", depthFormula: "D",     thicknessMM: 20, quantity: 1, sortOrder: 0, topEdge: true, defaultMaterialCategory: "GRANITO" },
    { componentType: "LATERAL",  label: "Borde delantero",      widthFormula: "W",      heightFormula: "6", depthFormula: "D",     thicknessMM: 20, quantity: 1, sortOrder: 1, defaultMaterialCategory: "MDF_LACADO" },
    { componentType: "DIVISION", label: "Soporte estructural",  widthFormula: "W - 10", heightFormula: "8", depthFormula: "D - 10",thicknessMM: 18, quantity: 3, sortOrder: 2, defaultMaterialCategory: "MELAMINA" },
  ],
  // Refrigerador
  "tpl-et-refrigerador": [
    { componentType: "LATERAL", label: "Lateral izquierdo", widthFormula: "D",      heightFormula: "H",     depthFormula: "D", thicknessMM: 18, quantity: 1, sortOrder: 0, leftEdge: true,  defaultMaterialCategory: "MELAMINA" },
    { componentType: "LATERAL", label: "Lateral derecho",   widthFormula: "D",      heightFormula: "H",     depthFormula: "D", thicknessMM: 18, quantity: 1, sortOrder: 1, rightEdge: true, defaultMaterialCategory: "MELAMINA" },
    { componentType: "TECHO",   label: "Techo superior",    widthFormula: "W - 3.6",heightFormula: "D",     depthFormula: "D", thicknessMM: 18, quantity: 1, sortOrder: 2, defaultMaterialCategory: "MELAMINA" },
    { componentType: "PISO",    label: "Base inferior",     widthFormula: "W - 3.6",heightFormula: "D",     depthFormula: "D", thicknessMM: 18, quantity: 1, sortOrder: 3, defaultMaterialCategory: "MELAMINA" },
    { componentType: "FONDO",   label: "Fondo ventilado",   widthFormula: "W - 3.6",heightFormula: "H - 3.6",depthFormula: "D",thicknessMM: 9,  quantity: 1, sortOrder: 4 },
  ],
  // Horno
  "tpl-et-horno": [
    { componentType: "LATERAL", label: "Lateral izquierdo", widthFormula: "D",      heightFormula: "H",     depthFormula: "D", thicknessMM: 18, quantity: 1, sortOrder: 0, leftEdge: true,  defaultMaterialCategory: "MDF_LACADO" },
    { componentType: "LATERAL", label: "Lateral derecho",   widthFormula: "D",      heightFormula: "H",     depthFormula: "D", thicknessMM: 18, quantity: 1, sortOrder: 1, rightEdge: true, defaultMaterialCategory: "MDF_LACADO" },
    { componentType: "TECHO",   label: "Marco superior",    widthFormula: "W - 3.6",heightFormula: "D",     depthFormula: "D", thicknessMM: 18, quantity: 1, sortOrder: 2 },
    { componentType: "PISO",    label: "Base inferior",     widthFormula: "W - 3.6",heightFormula: "D",     depthFormula: "D", thicknessMM: 18, quantity: 1, sortOrder: 3 },
    { componentType: "FONDO",   label: "Fondo de servicio", widthFormula: "W - 3.6",heightFormula: "H - 3.6",depthFormula: "D",thicknessMM: 9,  quantity: 1, sortOrder: 4 },
  ],
  // Panel de yeso
  "tpl-et-panel-yeso": [
    { componentType: "DIVISION", label: "Pliego",       widthFormula: "W", heightFormula: "H", depthFormula: "D", thicknessMM: 12, quantity: 1, sortOrder: 0, defaultMaterialCategory: "PANEL_YESO" },
  ],
};
