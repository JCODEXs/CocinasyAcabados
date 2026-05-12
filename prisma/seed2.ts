import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  // ── Buscar o crear usuario de prueba ──────────────────────────────────────
  const user = await db.user.findFirst();
  if (!user) {
    console.log("No hay usuarios. Crea una cuenta primero y vuelve a correr el seed.");
    return;
  }

  console.log(`Seeding catálogo para usuario: ${user.email}`);

  // ── Catálogo ──────────────────────────────────────────────────────────────
  const catalog = await db.catalog.upsert({
    where:  { userId: user.id },
    create: { userId: user.id },
    update: {},
  });

  // ── Materiales ────────────────────────────────────────────────────────────
  const materials = await Promise.all([
    db.material.upsert({
      where: { id: "seed-mat-mdf-blanco" },
      create: {
        id: "seed-mat-mdf-blanco",
        catalogId: catalog.id,
        name: "MDF 18mm blanco",
        category: "MDF_LACADO",
        pricePerM2: 85000,
        thicknessMM: 18,
        color: "#f0ede8",
        aiDescription: "white lacquered MDF, smooth matte finish",
      },
      update: {},
    }),
    db.material.upsert({
      where: { id: "seed-mat-melamina-wenge" },
      create: {
        id: "seed-mat-melamina-wenge",
        catalogId: catalog.id,
        name: "Melamina Wengué",
        category: "MELAMINA",
        pricePerM2: 62000,
        thicknessMM: 18,
        color: "#3d2b1f",
        aiDescription: "dark wenge wood grain melamine, textured surface",
      },
      update: {},
    }),
    db.material.upsert({
      where: { id: "seed-mat-granito-negro" },
      create: {
        id: "seed-mat-granito-negro",
        catalogId: catalog.id,
        name: "Granito negro absoluto",
        category: "GRANITO",
        pricePerM2: 380000,
        thicknessMM: 20,
        color: "#1a1a1a",
        aiDescription: "black absolute granite countertop, polished finish",
      },
      update: {},
    }),
    db.material.upsert({
      where: { id: "seed-mat-cuarzo-blanco" },
      create: {
        id: "seed-mat-cuarzo-blanco",
        catalogId: catalog.id,
        name: "Cuarzo blanco carrara",
        category: "CUARZO",
        pricePerM2: 420000,
        thicknessMM: 20,
        color: "#f5f2ee",
        aiDescription: "white carrara quartz countertop with subtle grey veining",
      },
      update: {},
    }),
    db.material.upsert({
      where: { id: "seed-mat-mdf-nogal" },
      create: {
        id: "seed-mat-mdf-nogal",
        catalogId: catalog.id,
        name: "MDF enchapado nogal",
        category: "MADERA_NATURAL",
        pricePerM2: 145000,
        thicknessMM: 18,
        color: "#7a5c3a",
        aiDescription: "walnut veneer MDF, natural wood grain, warm tone",
      },
      update: {},
    }),
    db.material.upsert({
      where: { id: "seed-mat-superboard" },
      create: {
        id: "seed-mat-superboard",
        catalogId: catalog.id,
        name: "Superboard 11mm",
        category: "SUPERBOARD",
        pricePerM2: 28000,
        thicknessMM: 11,
        color: "#e0ddd8",
        aiDescription: "fiber cement board, grey texture",
      },
      update: {},
    }),
  ]);

  // ── Herrajes ──────────────────────────────────────────────────────────────
  await Promise.all([
    db.hardware.upsert({
      where: { id: "seed-hw-bisagra-eco" },
      create: {
        id: "seed-hw-bisagra-eco",
        catalogId: catalog.id,
        name: "Bisagra 35mm básica",
        category: "BISAGRA",
        qualityTier: "ECONOMICO",
        pricePerUnit: 4500,
        unit: "und",
        description: "Bisagra de codo estándar sin amortiguar",
      },
      update: {},
    }),
    db.hardware.upsert({
      where: { id: "seed-hw-bisagra-blum" },
      create: {
        id: "seed-hw-bisagra-blum",
        catalogId: catalog.id,
        name: "Bisagra hidráulica Blum Clip Top",
        category: "BISAGRA",
        qualityTier: "PREMIUM",
        brand: "Blum",
        pricePerUnit: 28000,
        unit: "und",
        description: "Cierre suave, desmontaje rápido, 110°",
      },
      update: {},
    }),
    db.hardware.upsert({
      where: { id: "seed-hw-riel-eco" },
      create: {
        id: "seed-hw-riel-eco",
        catalogId: catalog.id,
        name: "Riel cajón telescópico 45cm",
        category: "RIEL_CAJON",
        qualityTier: "ESTANDAR",
        pricePerUnit: 18000,
        unit: "par",
        description: "Extensión total, 30kg de carga",
      },
      update: {},
    }),
    db.hardware.upsert({
      where: { id: "seed-hw-riel-blum" },
      create: {
        id: "seed-hw-riel-blum",
        catalogId: catalog.id,
        name: "Riel Blum Tandem con amortiguador",
        category: "RIEL_CAJON",
        qualityTier: "PREMIUM",
        brand: "Blum",
        pricePerUnit: 95000,
        unit: "par",
        description: "Cierre suave, extracción total, 50kg",
      },
      update: {},
    }),
    db.hardware.upsert({
      where: { id: "seed-hw-jalador-acero" },
      create: {
        id: "seed-hw-jalador-acero",
        catalogId: catalog.id,
        name: "Jalador barra acero 128mm",
        category: "JALADOR",
        qualityTier: "ESTANDAR",
        pricePerUnit: 12000,
        unit: "und",
        description: "Acero inoxidable cepillado",
      },
      update: {},
    }),
    db.hardware.upsert({
      where: { id: "seed-hw-jalador-oro" },
      create: {
        id: "seed-hw-jalador-oro",
        catalogId: catalog.id,
        name: "Jalador perfil dorado mate 160mm",
        category: "JALADOR",
        qualityTier: "LUJO",
        pricePerUnit: 42000,
        unit: "und",
        description: "Acabado PVD dorado mate, perfil cuadrado",
      },
      update: {},
    }),
    db.hardware.upsert({
      where: { id: "seed-hw-patas" },
      create: {
        id: "seed-hw-patas",
        catalogId: catalog.id,
        name: "Patas niveladoras 100-150mm",
        category: "PATAS_NIVELADORA",
        qualityTier: "ESTANDAR",
        pricePerUnit: 3500,
        unit: "und",
        description: "Plástico reforzado, regulación manual",
      },
      update: {},
    }),
  ]);

  // ── Cantos ────────────────────────────────────────────────────────────────
  await Promise.all([
    db.edgeTreatment.upsert({
      where: { id: "seed-edge-pvc-1" },
      create: {
        id: "seed-edge-pvc-1",
        catalogId: catalog.id,
        name: "Canto PVC 1mm",
        type: "CANTO_PVC",
        pricePerML: 1800,
        thicknessMM: 1,
      },
      update: {},
    }),
    db.edgeTreatment.upsert({
      where: { id: "seed-edge-pvc-2" },
      create: {
        id: "seed-edge-pvc-2",
        catalogId: catalog.id,
        name: "Canto PVC 2mm",
        type: "CANTO_PVC",
        pricePerML: 2800,
        thicknessMM: 2,
      },
      update: {},
    }),
    db.edgeTreatment.upsert({
      where: { id: "seed-edge-chaflan" },
      create: {
        id: "seed-edge-chaflan",
        catalogId: catalog.id,
        name: "Chaflan 45° CNC",
        type: "CHAFLAN_45",
        pricePerML: 8500,
        description: "Mecanizado con canteadora CNC",
      },
      update: {},
    }),
    db.edgeTreatment.upsert({
      where: { id: "seed-edge-aluminio" },
      create: {
        id: "seed-edge-aluminio",
        catalogId: catalog.id,
        name: "Perfil aluminio T",
        type: "PERFIL_ALUMINIO",
        pricePerML: 12000,
        thicknessMM: 2,
      },
      update: {},
    }),
  ]);

  // ── Insumos de ensamble ───────────────────────────────────────────────────
  await Promise.all([
    db.assemblySupply.upsert({
      where: { id: "seed-sup-confirmat" },
      create: {
        id: "seed-sup-confirmat",
        catalogId: catalog.id,
        name: "Tornillo Confirmat 7×50",
        category: "TORNILLO",
        unit: "und",
        pricePerUnit: 350,
        autoCalcRule: "8_PER_PANEL",
      },
      update: {},
    }),
    db.assemblySupply.upsert({
      where: { id: "seed-sup-tarugo" },
      create: {
        id: "seed-sup-tarugo",
        catalogId: catalog.id,
        name: "Tarugo plástico 8mm",
        category: "TARUGO",
        unit: "und",
        pricePerUnit: 180,
        autoCalcRule: "4_PER_PANEL",
      },
      update: {},
    }),
    db.assemblySupply.upsert({
      where: { id: "seed-sup-pegante" },
      create: {
        id: "seed-sup-pegante",
        catalogId: catalog.id,
        name: "Pegante PVA para madera",
        category: "PEGANTE",
        unit: "ml",
        pricePerUnit: 45,
        autoCalcRule: "0.15L_PER_M2",
      },
      update: {},
    }),
  ]);

  // ── Acabados de obra ──────────────────────────────────────────────────────
  await Promise.all([
    db.finish.upsert({
      where: { id: "seed-finish-estuco" },
      create: {
        id: "seed-finish-estuco",
        catalogId: catalog.id,
        name: "Estucado y pintura (2 manos)",
        pricePerM2: 28000,
        unit: "m²",
      },
      update: {},
    }),
    db.finish.upsert({
      where: { id: "seed-finish-ceramica" },
      create: {
        id: "seed-finish-ceramica",
        catalogId: catalog.id,
        name: "Instalación cerámica/porcelana",
        pricePerM2: 45000,
        unit: "m²",
      },
      update: {},
    }),
    db.finish.upsert({
      where: { id: "seed-finish-piso" },
      create: {
        id: "seed-finish-piso",
        catalogId: catalog.id,
        name: "Instalación piso laminado",
        pricePerM2: 22000,
        unit: "m²",
      },
      update: {},
    }),
  ]);

  // ── Tipos de elemento con templates de componentes ────────────────────────
  const elementTypes = await Promise.all([
    db.elementType.upsert({
      where: { id: "seed-et-mueble-bajo" },
      create: {
        id: "seed-et-mueble-bajo",
        catalogId: catalog.id,
        name: "Mueble bajo estándar",
        category: "MUEBLE_BAJO",
        unit: "POR_UNIDAD",
        basePrice: 350000,
        defaultWidth: 60,
        defaultHeight: 72,
        defaultDepth: 60,
        threeJsModel: "LowerCabinet",
        allowCustomWidth: true,
        allowCustomHeight: false,
        allowCustomDepth: false,
      },
      update: {},
    }),
    db.elementType.upsert({
      where: { id: "seed-et-mueble-alto" },
      create: {
        id: "seed-et-mueble-alto",
        catalogId: catalog.id,
        name: "Mueble alto estándar",
        category: "MUEBLE_ALTO",
        unit: "POR_UNIDAD",
        basePrice: 280000,
        defaultWidth: 60,
        defaultHeight: 80,
        defaultDepth: 35,
        threeJsModel: "UpperCabinet",
        allowCustomWidth: true,
        allowCustomHeight: false,
        allowCustomDepth: false,
      },
      update: {},
    }),
    db.elementType.upsert({
      where: { id: "seed-et-isla" },
      create: {
        id: "seed-et-isla",
        catalogId: catalog.id,
        name: "Isla central",
        category: "MUEBLE_BAJO",
        unit: "POR_UNIDAD",
        basePrice: 850000,
        defaultWidth: 120,
        defaultHeight: 90,
        defaultDepth: 90,
        threeJsModel: "Island",
        allowCustomWidth: true,
        allowCustomHeight: false,
        allowCustomDepth: true,
      },
      update: {},
    }),
    db.elementType.upsert({
      where: { id: "seed-et-refrigerador" },
      create: {
        id: "seed-et-refrigerador",
        catalogId: catalog.id,
        name: "Módulo refrigerador",
        category: "ELECTRODOMESTICO",
        unit: "POR_UNIDAD",
        basePrice: 0,
        defaultWidth: 70,
        defaultHeight: 180,
        defaultDepth: 70,
        threeJsModel: "Appliance",
        allowCustomWidth: false,
        allowCustomHeight: false,
        allowCustomDepth: false,
      },
      update: {},
    }),
    db.elementType.upsert({
      where: { id: "seed-et-horno" },
      create: {
        id: "seed-et-horno",
        catalogId: catalog.id,
        name: "Módulo horno empotrado",
        category: "ELECTRODOMESTICO",
        unit: "POR_UNIDAD",
        basePrice: 0,
        defaultWidth: 60,
        defaultHeight: 60,
        defaultDepth: 55,
        threeJsModel: "Appliance",
        allowCustomWidth: false,
        allowCustomHeight: false,
        allowCustomDepth: false,
      },
      update: {},
    }),
    db.elementType.upsert({
      where: { id: "seed-et-meson" },
      create: {
        id: "seed-et-meson",
        catalogId: catalog.id,
        name: "Mesón corrido",
        category: "MESON",
        unit: "POR_ML",
        basePrice: 180000,
        defaultWidth: 100,
        defaultHeight: 4,
        defaultDepth: 62,
        threeJsModel: "CountertopSection",
        allowCustomWidth: true,
        allowCustomHeight: false,
        allowCustomDepth: false,
      },
      update: {},
    }),
    db.elementType.upsert({
      where: { id: "seed-et-panel-yeso" },
      create: {
        id: "seed-et-panel-yeso",
        catalogId: catalog.id,
        name: "Panel yeso Drywall",
        category: "PANEL_YESO",
        unit: "POR_M2",
        basePrice: 45000,
        defaultWidth: 120,
        defaultHeight: 240,
        defaultDepth: 10,
        threeJsModel: "WallPanel",
        allowCustomWidth: true,
        allowCustomHeight: true,
        allowCustomDepth: false,
      },
      update: {},
    }),
  ]);

  // ── ComponentTemplates para mueble bajo ──────────────────────────────────
  const muebBajo = elementTypes[0]!;
  await db.componentTemplate.deleteMany({ where: { elementTypeId: muebBajo.id } });
  await db.componentTemplate.createMany({
    data: [
      { elementTypeId: muebBajo.id, componentType: "LATERAL",   label: "Lateral izquierdo", widthFormula: "D",     heightFormula: "H - 8",  depthFormula: "D",     thicknessMM: 18, quantity: 1, sortOrder: 0, topEdge: false, bottomEdge: false, leftEdge: true, rightEdge: false },
      { elementTypeId: muebBajo.id, componentType: "LATERAL",   label: "Lateral derecho",   widthFormula: "D",     heightFormula: "H - 8",  depthFormula: "D",     thicknessMM: 18, quantity: 1, sortOrder: 1, topEdge: false, bottomEdge: false, leftEdge: false, rightEdge: true },
      { elementTypeId: muebBajo.id, componentType: "FONDO",     label: "Fondo",             widthFormula: "W - 3.6",heightFormula: "H - 8",  depthFormula: "D",     thicknessMM: 9,  quantity: 1, sortOrder: 2, topEdge: false, bottomEdge: false, leftEdge: false, rightEdge: false },
      { elementTypeId: muebBajo.id, componentType: "PISO",      label: "Piso",              widthFormula: "W - 3.6",heightFormula: "D",      depthFormula: "D",     thicknessMM: 18, quantity: 1, sortOrder: 3, topEdge: false, bottomEdge: false, leftEdge: false, rightEdge: false },
      { elementTypeId: muebBajo.id, componentType: "TECHO",     label: "Techo interno",     widthFormula: "W - 3.6",heightFormula: "D",      depthFormula: "D",     thicknessMM: 18, quantity: 1, sortOrder: 4, topEdge: false, bottomEdge: false, leftEdge: false, rightEdge: false },
      { elementTypeId: muebBajo.id, componentType: "PUERTA",    label: "Puerta",            widthFormula: "W / 2", heightFormula: "H - 11", depthFormula: "D",     thicknessMM: 18, quantity: 2, sortOrder: 5, topEdge: true,  bottomEdge: true,  leftEdge: true,  rightEdge: true,  defaultSurfaceFinishType: "LACADO" },
      { elementTypeId: muebBajo.id, componentType: "MESON",     label: "Mesón",             widthFormula: "W + 2", heightFormula: "D + 4",  depthFormula: "D",     thicknessMM: 20, quantity: 1, sortOrder: 6, topEdge: false, bottomEdge: false, leftEdge: false, rightEdge: false, defaultMaterialCategory: "GRANITO" },
    ],
  });

  // ── ComponentTemplates para mueble alto ──────────────────────────────────
  const muebAlto = elementTypes[1]!;
  await db.componentTemplate.deleteMany({ where: { elementTypeId: muebAlto.id } });
  await db.componentTemplate.createMany({
    data: [
      { elementTypeId: muebAlto.id, componentType: "LATERAL",   label: "Lateral izquierdo", widthFormula: "D",      heightFormula: "H",       depthFormula: "D", thicknessMM: 18, quantity: 1, sortOrder: 0, topEdge: false, bottomEdge: false, leftEdge: true,  rightEdge: false },
      { elementTypeId: muebAlto.id, componentType: "LATERAL",   label: "Lateral derecho",   widthFormula: "D",      heightFormula: "H",       depthFormula: "D", thicknessMM: 18, quantity: 1, sortOrder: 1, topEdge: false, bottomEdge: false, leftEdge: false, rightEdge: true  },
      { elementTypeId: muebAlto.id, componentType: "FONDO",     label: "Fondo",             widthFormula: "W - 3.6",heightFormula: "H",       depthFormula: "D", thicknessMM: 9,  quantity: 1, sortOrder: 2, topEdge: false, bottomEdge: false, leftEdge: false, rightEdge: false },
      { elementTypeId: muebAlto.id, componentType: "TECHO",     label: "Techo",             widthFormula: "W - 3.6",heightFormula: "D",       depthFormula: "D", thicknessMM: 18, quantity: 1, sortOrder: 3, topEdge: false, bottomEdge: false, leftEdge: false, rightEdge: false },
      { elementTypeId: muebAlto.id, componentType: "PISO",      label: "Piso interno",      widthFormula: "W - 3.6",heightFormula: "D",       depthFormula: "D", thicknessMM: 18, quantity: 1, sortOrder: 4, topEdge: false, bottomEdge: false, leftEdge: false, rightEdge: false },
      { elementTypeId: muebAlto.id, componentType: "ENTREPAÑO", label: "Entrepaño",         widthFormula: "W - 3.6",heightFormula: "D - 2",   depthFormula: "D", thicknessMM: 18, quantity: 1, sortOrder: 5, topEdge: false, bottomEdge: false, leftEdge: false, rightEdge: false },
      { elementTypeId: muebAlto.id, componentType: "PUERTA",    label: "Puerta",            widthFormula: "W - 1.8",heightFormula: "H - 1.8", depthFormula: "D", thicknessMM: 18, quantity: 1, sortOrder: 6, topEdge: true,  bottomEdge: true,  leftEdge: true,  rightEdge: true,  defaultSurfaceFinishType: "LACADO" },
    ],
  });

  console.log("✅ Seed completado exitosamente");
  console.log(`   - ${materials.length} materiales`);
  console.log(`   - 7 herrajes`);
  console.log(`   - 4 cantos`);
  console.log(`   - 3 insumos de ensamble`);
  console.log(`   - 3 acabados de obra`);
  console.log(`   - ${elementTypes.length} tipos de elemento con templates`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());