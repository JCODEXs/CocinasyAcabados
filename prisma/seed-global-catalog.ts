// prisma/seed-global-catalog.ts
//
// Pobla el "catálogo global" — un único Catalog con isGlobal=true y
// userId=null que contiene los items marcados como template (`isTemplate: true`).
// Los instaladores los importan a su catálogo personal desde
// /dashboard/catalog/import.
//
// Idempotente: usa upsert por id (`tpl-*`). Re-ejecutar no duplica.
//
// Uso:  npm run db:seed:global

import { PrismaClient } from "@prisma/client";
import { ELEMENT_TYPES, COMPONENT_TEMPLATES_BY_ET } from "./seed-global-catalog.data";

const db = new PrismaClient();

const GLOBAL_CATALOG_ID = "global-template-catalog";

async function main() {
  // ── Catálogo global ──────────────────────────────────────────────────────
  const catalog = await db.catalog.upsert({
    where:  { id: GLOBAL_CATALOG_ID },
    create: { id: GLOBAL_CATALOG_ID, isGlobal: true, userId: null },
    update: { isGlobal: true },
  });
  console.log(`✓ Catálogo global listo: ${catalog.id}`);

  // ── Materiales ───────────────────────────────────────────────────────────
  const materials = [
    { id: "tpl-mat-mdf-blanco",     name: "MDF 18mm blanco",            category: "MDF_LACADO" as const,     pricePerM2: 85000,  thicknessMM: 18, color: "#f0ede8", aiDescription: "white lacquered MDF, smooth matte finish" },
    { id: "tpl-mat-melamina-wenge", name: "Melamina Wengué",            category: "MELAMINA" as const,       pricePerM2: 62000,  thicknessMM: 18, color: "#3d2b1f", aiDescription: "dark wenge wood grain melamine, textured surface" },
    { id: "tpl-mat-granito-negro",  name: "Granito negro absoluto",     category: "GRANITO" as const,        pricePerM2: 380000, thicknessMM: 20, color: "#1a1a1a", aiDescription: "black absolute granite countertop, polished finish" },
    { id: "tpl-mat-cuarzo-blanco",  name: "Cuarzo blanco carrara",      category: "CUARZO" as const,         pricePerM2: 420000, thicknessMM: 20, color: "#f5f2ee", aiDescription: "white carrara quartz countertop with subtle grey veining" },
    { id: "tpl-mat-mdf-nogal",      name: "MDF enchapado nogal",        category: "MADERA_NATURAL" as const, pricePerM2: 145000, thicknessMM: 18, color: "#7a5c3a", aiDescription: "walnut veneer MDF, natural wood grain, warm tone" },
    { id: "tpl-mat-superboard",     name: "Superboard 11mm",            category: "SUPERBOARD" as const,     pricePerM2: 28000,  thicknessMM: 11, color: "#e0ddd8", aiDescription: "fiber cement board, grey texture" },
    { id: "tpl-mat-melamina-blanca",name: "Melamina blanca",            category: "MELAMINA" as const,       pricePerM2: 48000,  thicknessMM: 18, color: "#f8f8f8", aiDescription: "plain white melamine, smooth finish" },
    { id: "tpl-mat-marmol-carrara", name: "Mármol Carrara natural",     category: "MARMOL" as const,         pricePerM2: 520000, thicknessMM: 20, color: "#ece7df", aiDescription: "natural Carrara marble with grey veining" },
  ];
  for (const m of materials) {
    await db.material.upsert({
      where:  { id: m.id },
      create: { ...m, catalogId: catalog.id, isTemplate: true },
      update: { ...m, catalogId: catalog.id, isTemplate: true },
    });
  }
  console.log(`✓ ${materials.length} materiales`);

  // ── Herrajes ─────────────────────────────────────────────────────────────
  const hardware = [
    { id: "tpl-hw-bisagra-eco",   name: "Bisagra 35mm básica",                category: "BISAGRA" as const,          qualityTier: "ECONOMICO" as const, pricePerUnit: 4500,  unit: "und", description: "Bisagra de codo estándar sin amortiguar" },
    { id: "tpl-hw-bisagra-blum",  name: "Bisagra hidráulica Blum Clip Top",   category: "BISAGRA" as const,          qualityTier: "PREMIUM" as const,   pricePerUnit: 28000, unit: "und", brand: "Blum", description: "Cierre suave, desmontaje rápido, 110°" },
    { id: "tpl-hw-riel-eco",      name: "Riel cajón telescópico 45cm",        category: "RIEL_CAJON" as const,       qualityTier: "ESTANDAR" as const,  pricePerUnit: 18000, unit: "par", description: "Extensión total, 30kg de carga" },
    { id: "tpl-hw-riel-blum",     name: "Riel Blum Tandem con amortiguador",  category: "RIEL_CAJON" as const,       qualityTier: "PREMIUM" as const,   pricePerUnit: 95000, unit: "par", brand: "Blum", description: "Cierre suave, extracción total, 50kg" },
    { id: "tpl-hw-jalador-acero", name: "Jalador barra acero 128mm",          category: "JALADOR" as const,          qualityTier: "ESTANDAR" as const,  pricePerUnit: 12000, unit: "und", description: "Acero inoxidable cepillado" },
    { id: "tpl-hw-jalador-oro",   name: "Jalador perfil dorado mate 160mm",   category: "JALADOR" as const,          qualityTier: "LUJO" as const,      pricePerUnit: 42000, unit: "und", description: "Acabado PVD dorado mate, perfil cuadrado" },
    { id: "tpl-hw-patas",         name: "Patas niveladoras 100-150mm",        category: "PATAS_NIVELADORA" as const, qualityTier: "ESTANDAR" as const,  pricePerUnit: 3500,  unit: "und", description: "Plástico reforzado, regulación manual" },
  ];
  for (const h of hardware) {
    await db.hardware.upsert({
      where:  { id: h.id },
      create: { ...h, catalogId: catalog.id, isTemplate: true },
      update: { ...h, catalogId: catalog.id, isTemplate: true },
    });
  }
  console.log(`✓ ${hardware.length} herrajes`);

  // ── Cantos ───────────────────────────────────────────────────────────────
  const edges = [
    { id: "tpl-edge-pvc-1",    name: "Canto PVC 1mm",        type: "CANTO_PVC" as const,       pricePerML: 1800,  thicknessMM: 1 },
    { id: "tpl-edge-pvc-2",    name: "Canto PVC 2mm",        type: "CANTO_PVC" as const,       pricePerML: 2800,  thicknessMM: 2 },
    { id: "tpl-edge-chaflan",  name: "Chaflán 45° CNC",      type: "CHAFLAN_45" as const,      pricePerML: 8500,  description: "Mecanizado con canteadora CNC" },
    { id: "tpl-edge-aluminio", name: "Perfil aluminio T",    type: "PERFIL_ALUMINIO" as const, pricePerML: 12000, thicknessMM: 2 },
    { id: "tpl-edge-melamina", name: "Canto melamina 0.4mm", type: "CANTO_MELAMINA" as const,  pricePerML: 900,   thicknessMM: 1 },
    { id: "tpl-edge-postform", name: "Postformado",          type: "POSTFORMADO" as const,     pricePerML: 14000, description: "Mesón con borde redondeado en una pieza" },
  ];
  for (const e of edges) {
    await db.edgeTreatment.upsert({
      where:  { id: e.id },
      create: { ...e, catalogId: catalog.id, isTemplate: true },
      update: { ...e, catalogId: catalog.id, isTemplate: true },
    });
  }
  console.log(`✓ ${edges.length} cantos`);

  // ── Insumos de ensamble ──────────────────────────────────────────────────
  const supplies = [
    { id: "tpl-sup-confirmat", name: "Tornillo Confirmat 7×50",   category: "TORNILLO" as const, unit: "und", pricePerUnit: 350, autoCalcRule: "8_PER_PANEL" },
    { id: "tpl-sup-tarugo",    name: "Tarugo plástico 8mm",       category: "TARUGO" as const,   unit: "und", pricePerUnit: 180, autoCalcRule: "4_PER_PANEL" },
    { id: "tpl-sup-pegante",   name: "Pegante PVA para madera",   category: "PEGANTE" as const,  unit: "ml",  pricePerUnit: 45,  autoCalcRule: "0.15L_PER_M2" },
    { id: "tpl-sup-anclaje",   name: "Anclaje pared M6",          category: "ANCLAJE" as const,  unit: "und", pricePerUnit: 1200 },
  ];
  for (const s of supplies) {
    await db.assemblySupply.upsert({
      where:  { id: s.id },
      create: { ...s, catalogId: catalog.id, isTemplate: true },
      update: { ...s, catalogId: catalog.id, isTemplate: true },
    });
  }
  console.log(`✓ ${supplies.length} insumos`);

  // ── Acabados de obra ─────────────────────────────────────────────────────
  const finishes = [
    { id: "tpl-finish-estuco",   name: "Estucado y pintura (2 manos)",      pricePerM2: 28000, unit: "m²" },
    { id: "tpl-finish-ceramica", name: "Instalación cerámica/porcelana",    pricePerM2: 45000, unit: "m²" },
    { id: "tpl-finish-piso",     name: "Instalación piso laminado",         pricePerM2: 22000, unit: "m²" },
    { id: "tpl-finish-vinil",    name: "Vinil decorativo / wallpaper",      pricePerM2: 18000, unit: "m²" },
  ];
  for (const f of finishes) {
    await db.finish.upsert({
      where:  { id: f.id },
      create: { ...f, catalogId: catalog.id, isTemplate: true },
      update: { ...f, catalogId: catalog.id, isTemplate: true },
    });
  }
  console.log(`✓ ${finishes.length} acabados de obra`);

  // ── Tipos de elemento + ComponentTemplates ───────────────────────────────
  await seedElementTypes(catalog.id);

  console.log("\n✅ Catálogo global poblado correctamente");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());

// --- helpers ---

async function seedElementTypes(catalogId: string) {
  for (const et of ELEMENT_TYPES) {
    await db.elementType.upsert({
      where:  { id: et.id },
      create: { ...et, catalogId, isTemplate: true },
      update: { ...et, catalogId, isTemplate: true },
    });

    const templates = COMPONENT_TEMPLATES_BY_ET[et.id] ?? [];
    await db.componentTemplate.deleteMany({ where: { elementTypeId: et.id } });
    if (templates.length > 0) {
      await db.componentTemplate.createMany({
        data: templates.map((t) => ({ ...t, elementTypeId: et.id })),
      });
    }
  }
  console.log(`✓ ${ELEMENT_TYPES.length} tipos de elemento + componentTemplates`);
}
