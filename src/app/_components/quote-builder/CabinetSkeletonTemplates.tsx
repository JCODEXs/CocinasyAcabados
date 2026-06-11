import type { MaterialCategory, SurfaceFinishType } from "@prisma/client";
// ─── Tipos ────────────────────────────────────────────────────────────────────

const COMPONENT_TYPES = [
  "LATERAL", "FONDO", "TECHO", "PISO", "ENTREPAÑO",
  "PUERTA", "FRENTE_CAJON", "CAJA_CAJON", "MESON", "ZOCALO", "DIVISION", "RIEL","ESQUINERO"
] as const;
type SkeletonConfigValue = 
  | "BASE_CABINET" | "WALL_CABINET" | "ISLAND" | "DRAWER_UNIT"  // for style
  | "LATERAL_PASANTE" | "PISO_PASANTE"                          // for assembly
  | number                                                        // for zocalo, thicknessMM, backThicknessMM
  | boolean; 
  type ComponentTypeStr = typeof COMPONENT_TYPES[number];

  interface SkeletonConfig {
  style:         "BASE_CABINET" | "WALL_CABINET" | "ISLAND" | "DRAWER_UNIT"|"ESQUINERO";
  assembly:      "LATERAL_PASANTE" | "PISO_PASANTE";
  zocalo:        number;
  hasCeiling:    boolean;
  hasBack:       boolean;
  hasBase:       boolean;
  thicknessMM:   number;
  backThicknessMM: number;
  CutX:            number;
  CutY:            number
}
interface TemplateRow {
  id?:                     string;
  componentType:           ComponentTypeStr;
  label:                   string;
  // Fórmulas de DIMENSIÓN
  widthFormula:            string;
  heightFormula:           string;
  depthFormula:            string;
  // Fórmulas de POSICIÓN (centro del panel en cm)
  posXFormula:             string;
  posYFormula:             string;
  posZFormula:             string;
  CutX:                    number;
  CutY:                    number;
  cornerToCut:              'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
//   thicknessMM:             number;
// Rotations agregar a setTemplate y a row
//   rotXFormula:             string;
//   rotYFormula:             string;
//   rotZFormula:             string;
  quantity:                number;
  sortOrder:               number;
  topEdge:                 boolean;
  bottomEdge:              boolean;
  leftEdge:                boolean;
  rightEdge:               boolean;
  defaultMaterialCategory: MaterialCategory;
  defaultSurfaceFinishType:SurfaceFinishType;
}
export function generateBaseCabinetSkeleton(cfg: SkeletonConfig): TemplateRow[] {
  const T = cfg.thicknessMM / 10;
  const TF = cfg.backThicknessMM / 10;
  const Z = cfg.zocalo;
  const isLP = cfg.assembly === "LATERAL_PASANTE";

  const latH = isLP ? `H - ${Z}` : `H - ${Z} - T`;
  const latPY = isLP ? `(H - ${Z}) / 2 + ${Z}` : `(H - ${Z} - T) / 2 + ${Z} + T/2`;
  const techoW = isLP ? `W - T * 2` : `W`;
  const pisoW = isLP ? `W - T * 2` : `W`;
  const sueloPY = `${Z} + T / 2`;
 const  sueloPanH="T"

  const rows: TemplateRow[] = [];
  let sort = 0;
  const base = (overrides: Partial<TemplateRow>): TemplateRow => ({
    componentType:           "LATERAL",
    label:                   "",
    widthFormula:            "T",
    heightFormula:           "H",
    depthFormula:            "D",
    posXFormula:             "0",
    posYFormula:             "H / 2",
    posZFormula:             "0",
    CutX:                    0,
    CutY:                    0,
    // thicknessMM:             cfg.thicknessMM,
    quantity:                1,
    sortOrder:               sort++,
    topEdge:                 false,
    bottomEdge:              false,
    leftEdge:                true,
    rightEdge:               false,
    defaultMaterialCategory: "MELAMINA",
    defaultSurfaceFinishType:"MELAMINA",
    cornerToCut:            "bottom-left",
    ...overrides,
  });
 // ── Laterales ────────────────────────────────────────────────────────────
  rows.push(base({
    componentType: "LATERAL", label: "Lateral Izq",
    widthFormula:  "T",
    heightFormula: latH,
    depthFormula:  "D",
    posXFormula:   "-W / 2 + T / 2",
    posYFormula:   latPY,
    posZFormula:   "0",
    leftEdge: true, rightEdge: false,
  }));

  rows.push(base({
    componentType: "LATERAL", label: "Lateral Der",
    widthFormula:  "T",
    heightFormula: latH,
    depthFormula:  "D",
    posXFormula:   "W / 2 - T / 2",
    posYFormula:   latPY,
    posZFormula:   "0",
    leftEdge: false, rightEdge: true,
    sortOrder:     sort++,
  }));

  // ── Piso ─────────────────────────────────────────────────────────────────
  if (cfg.hasBase) rows.push(base({
    componentType: "PISO", label: "Piso",
    widthFormula:  pisoW,
    heightFormula: sueloPanH,
    depthFormula:  `D - ${TF}`,
    posXFormula:   "0",
    posYFormula:   sueloPY,
    posZFormula:   `${TF} / 2`,
    topEdge: false, bottomEdge: false, leftEdge: false, rightEdge: false,
    sortOrder: sort++,
  }));

  // ── Techo ─────────────────────────────────────────────────────────────────
  if (cfg.hasCeiling) rows.push(base({
    componentType: "TECHO", label: "Techo",
    widthFormula:  techoW,
    heightFormula: "T",
    depthFormula:  `D - ${TF}`,
    posXFormula:   "0",
    posYFormula:   `H - T / 2`,
    posZFormula:   `${TF} / 2`,
    topEdge: true, bottomEdge: false,
    sortOrder: sort++,
  }));

  // ── Fondo ─────────────────────────────────────────────────────────────────
  if (cfg.hasBack) rows.push(base({
    componentType:   "FONDO", label: "Fondo",
    widthFormula:    `W - T * 2`,
    heightFormula:   `H - ${Z} - T`,
    depthFormula:    `${TF}`,
    posXFormula:     "0",
    posYFormula:     `(H - ${Z} - T) / 2 + ${Z} + T / 2`,
    posZFormula:     `-D / 2 + ${TF} / 2`,
    // thicknessMM:     cfg.backThicknessMM,
    sortOrder: sort++,
  }));

  // ── Zócalo ────────────────────────────────────────────────────────────────
  if (Z > 0) rows.push(base({
    componentType: "ZOCALO", label: "Zócalo",
    widthFormula:  `W - T * 2`,
    heightFormula: `${Z}`,
    depthFormula:  "T",
    posXFormula:   "0",
    posYFormula:   `${Z} / 2`,
    posZFormula:   `D / 2 - T / 2-5`,
    sortOrder: sort++,
  }));

  return rows;

}

export function generateWallCabinetSkeleton(cfg: SkeletonConfig): TemplateRow[] {
  // Forzar valores característicos de un mueble alto
  const wallCfg: SkeletonConfig = {
    ...cfg,
    zocalo: 0,               // sin zócalo
    hasCeiling: true,        // siempre con techo
    hasBase: true,           // sí tiene piso
  };
  return generateBaseCabinetSkeleton(wallCfg);
}

export function generateIslandSkeleton(cfg: SkeletonConfig): TemplateRow[] {
  const islandCfg: SkeletonConfig = {
    ...cfg,
    hasBack: false,      // normalmente sin fondo
    hasCeiling: true,    // suele tener cubierta vista
    zocalo: 0,           // sin zócalo o con zócalo visto (según diseño)
  };
  const rows = generateBaseCabinetSkeleton(islandCfg);
  // Podrías agregar una tapa más gruesa o voladizos aquí
  return rows;
}

export function generateDrawerUnitSkeleton(cfg: SkeletonConfig): TemplateRow[] {
  // Igual que base, pero podrías añadir una fila especial "FRENTE_CAJON" genérico
  const rows = generateBaseCabinetSkeleton(cfg);
  // Ejemplo: agregar un frente de cajón placeholder (opcional)
  // rows.push(createDrawerFrontPlaceholder(cfg));
  return rows;
}

export function generateEsquineroSkeleton(cfg: SkeletonConfig): TemplateRow[] {
  const T = `${cfg.thicknessMM / 10}`;       // Convertido a la unidad de tu app
  const TF = `${cfg.backThicknessMM / 10}`;   // Espesor del fondo
  const Z = `${cfg.zocalo}`;
  
  // Variables de corte dinámicas pasadas a las fórmulas string
  const CX = `${cfg.CutX}`;
  const CY = `${cfg.CutY}`;

  const rows: TemplateRow[] = [];
  let sort = 0;

   const base = (overrides: Partial<TemplateRow>): TemplateRow => ({
    componentType:           "LATERAL",
    label:                   "",
    widthFormula:            "T",
    heightFormula:           "H",
    depthFormula:            "D",
    posXFormula:             "0",
    posYFormula:             "H / 2",
    posZFormula:             "0",
    CutX:                    35,
    CutY:                    35,
    // thicknessMM:             cfg.thicknessMM,
    quantity:                1,
    sortOrder:               sort++,
    topEdge:                 false,
    bottomEdge:              false,
    leftEdge:                true,
    rightEdge:               false,
    defaultMaterialCategory: "MELAMINA",
    defaultSurfaceFinishType:"MELAMINA",
    cornerToCut:            "bottom-left",
    ...overrides,
  });

  // ==========================================
  // 1. PISO Y TAPA (Paneles con corte en L)
  // ==========================================
  
  // Piso del mueble (Por encima del zócalo)
  rows.push(base({
    componentType: "ESQUINERO",
    label: "Piso Esquinero",
    widthFormula: "W+CX",
    heightFormula: "T",
    depthFormula: "D+CY",
    posXFormula: "0",
    posYFormula: `${Z} + ${T}/2`,
    posZFormula: "0",
    CutX: 35,
    CutY: 35,
    cornerToCut: "bottom-left" // Esquina interna del frente si miramos desde arriba
  }));

  // Techo / Tapa superior
  rows.push(base({
    componentType: "ESQUINERO",
    label: "Techo Esquinero",
    widthFormula: "W+CX",
    heightFormula: T,
    depthFormula: "D+CY",
    posXFormula: "0",
    posYFormula: `H - ${T}/2`,
    posZFormula: "0",
    CutX: 35,
    CutY: 35,
    cornerToCut: "bottom-left"
  }));

  // ==========================================
  // 2. LATERALES EXTERNOS (Los que van a las paredes)
  // ==========================================
  
  // Altura útil de los laterales (Entre el zócalo y el techo)
  const lateralH = `H - ${Z} - ${T}`;

  // Lateral Izquierdo Externo (Fondo del brazo izquierdo)
  rows.push(base({
    componentType: "LATERAL",
    label: "Lateral Izquierdo Externo",
    widthFormula: T,
    heightFormula: lateralH,
    depthFormula: "D",
    posXFormula: `-W/2 + ${T}/2-CX`,
    posYFormula: `(${lateralH})/2 + ${Z}`,
    posZFormula: "0",
  }));

  // Lateral Derecho Externo (Fondo del brazo derecho)
  rows.push(base({
    componentType: "LATERAL",
    label: "Lateral Derecho Externo",
    widthFormula: `W - ${T}`, // Se resta el espesor del lateral izquierdo para no encimarse
    heightFormula: lateralH,
    depthFormula: T,
    posXFormula: `${T}/2`,
    posYFormula: `(${lateralH})/2 + ${Z}`,
    posZFormula: `-D/2 + ${T}/2`,
  }));

  // ==========================================
  // 3. LATERALES FRONTALES (Los que cierran los brazos de la L)
  // ==========================================

  // Lateral Frontal Izquierdo (Donde terminaría el mueble a la izquierda si hay otra alacena)
  rows.push(base({
    componentType: "LATERAL",
    label: "Lateral Frontal Izquierdo",
    widthFormula: `W - ${CX}`,
    heightFormula: lateralH,
    depthFormula: T,
    posXFormula: `(-W + ${CX})/2`,
    posYFormula: `(${lateralH})/2 + ${Z}`,
    posZFormula: `D/2 - ${T}/2`,
  }));

  // Lateral Frontal Derecho (Donde termina el mueble a la derecha)
  rows.push(base({
    componentType: "LATERAL",
    label: "Lateral Frontal Derecho",
    widthFormula: T,
    heightFormula: lateralH,
    depthFormula: `D - ${CY}`,
    posXFormula: `W/2 - ${T}/2`,
    posYFormula: `(${lateralH})/2 + ${Z}`,
    posZFormula: `(D - ${CY})/2`,
  }));

  // ==========================================
  // 4. ZÓCALOS (Estructura de soporte inferior)
  // ==========================================
  
  // Zócalo Izquierdo
  rows.push(base({
    componentType: "ZOCALO",
    label: "Zócalo Izquierdo",
    widthFormula: T,
    heightFormula: Z,
    depthFormula: "D - T",
    posXFormula: `-W/2 + ${T}/2`,
    posYFormula: `${Z}/2`,
    posZFormula: `${T}/2`,
  }));

  // Zócalo Derecho
  rows.push(base({
    componentType: "ZOCALO",
    label: "Zócalo Derecho",
    widthFormula: `W - ${T}`,
    heightFormula: Z,
    depthFormula: T,
    posXFormula: `${T}/2`,
    posYFormula: `${Z}/2`,
    posZFormula: `-D/2 + ${T}/2`,
  }));

  return rows;
}