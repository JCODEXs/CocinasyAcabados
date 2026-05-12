// seed-component-templates.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding additional component templates for kitchen elements...");

  // Get existing element types
  const elementTypes = await db.elementType.findMany({
    where: {
      id: {
        in: [
          "seed-et-isla",
          "seed-et-meson",
          "seed-et-refrigerador",
          "seed-et-horno",
          "seed-et-panel-yeso",
        ],
      },
    },
  });

  const isla = elementTypes.find(et => et.id === "seed-et-isla");
  const meson = elementTypes.find(et => et.id === "seed-et-meson");
  const refrigerador = elementTypes.find(et => et.id === "seed-et-refrigerador");
  const horno = elementTypes.find(et => et.id === "seed-et-horno");
  const panelYeso = elementTypes.find(et => et.id === "seed-et-panel-yeso");

  if (!isla || !meson || !refrigerador || !horno || !panelYeso) {
    console.error("❌ Missing required element types. Run main seed first.");
    return;
  }

  // ── ComponentTemplates para Isla central ──────────────────────────────────
  await db.componentTemplate.deleteMany({ where: { elementTypeId: isla.id } });
  await db.componentTemplate.createMany({
    data: [
      { 
        elementTypeId: isla.id, 
        componentType: "LATERAL",   
        label: "Frente decorativo", 
        widthFormula: "D",     
        heightFormula: "H",      
        depthFormula: "D",     
        thicknessMM: 18, 
        quantity: 1, 
        sortOrder: 0, 
        topEdge: true,  
        bottomEdge: false, 
        leftEdge: true,  
        rightEdge: true,
        defaultSurfaceFinishType: "LACADO",
        defaultMaterialCategory: "MDF_LACADO"
      },
      { 
        elementTypeId: isla.id, 
        componentType: "LATERAL",   
        label: "Posterior", 
        widthFormula: "D",     
        heightFormula: "H",      
        depthFormula: "D",     
        thicknessMM: 18, 
        quantity: 1, 
        sortOrder: 1, 
        topEdge: false,  
        bottomEdge: false, 
        leftEdge: false,  
        rightEdge: false,
        defaultMaterialCategory: "MELAMINA"
      },
      { 
        elementTypeId: isla.id, 
        componentType: "LATERAL",   
        label: "Estructura interna", 
        widthFormula: "W - 3.6",     
        heightFormula: "H - 3.6",      
        depthFormula: "D - 3.6",     
        thicknessMM: 18, 
        quantity: 4, 
        sortOrder: 2, 
        topEdge: false,  
        bottomEdge: false, 
        leftEdge: false,  
        rightEdge: false 
      },
      { 
        elementTypeId: isla.id, 
        componentType: "PISO",      
        label: "Base inferior", 
        widthFormula: "W - 3.6",
        heightFormula: "D - 3.6",      
        depthFormula: "D",     
        thicknessMM: 18, 
        quantity: 1, 
        sortOrder: 3, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: false 
      },
      { 
        elementTypeId: isla.id, 
        componentType: "TECHO",     
        label: "Cubierta superior", 
        widthFormula: "W + 4", 
        heightFormula: "D + 4",      
        depthFormula: "D",     
        thicknessMM: 20, 
        quantity: 1, 
        sortOrder: 4, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: false,
        defaultMaterialCategory: "GRANITO"
      },
      { 
        elementTypeId: isla.id, 
        componentType: "ZOCALO",    
        label: "Zócalo", 
        widthFormula: "W", 
        heightFormula: "10",      
        depthFormula: "D",     
        thicknessMM: 18, 
        quantity: 1, 
        sortOrder: 5, 
        topEdge: true,  
        bottomEdge: true,  
        leftEdge: false,  
        rightEdge: false 
      },
      { 
        elementTypeId: isla.id, 
        componentType: "CAJA_CAJON",     
        label: "Cajón (x2)", 
        widthFormula: "(W / 2) - 5", 
        heightFormula: "20",      
        depthFormula: "D - 10",     
        thicknessMM: 15, 
        quantity: 2, 
        sortOrder: 6, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: false,
        defaultMaterialCategory: "MELAMINA"
      },
    ],
  });

  // ── ComponentTemplates para Mesón corrido ─────────────────────────────────
  await db.componentTemplate.deleteMany({ where: { elementTypeId: meson.id } });
  await db.componentTemplate.createMany({
    data: [
      { 
        elementTypeId: meson.id, 
        componentType: "MESON",     
        label: "Plancha de mesón", 
        widthFormula: "W", 
        heightFormula: "D",      
        depthFormula: "D",     
        thicknessMM: 20, 
        quantity: 1, 
        sortOrder: 0, 
        topEdge: true,  
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: false,
        defaultMaterialCategory: "GRANITO"
      },
      { 
        elementTypeId: meson.id, 
        componentType: "LATERAL",     
        label: "Borde delantero", 
        widthFormula: "W", 
        heightFormula: "6",      
        depthFormula: "D",     
        thicknessMM: 20, 
        quantity: 1, 
        sortOrder: 1, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: false,
        defaultMaterialCategory: "MDF_LACADO"
      },
      { 
        elementTypeId: meson.id, 
        componentType: "DIVISION",   
        label: "Soporte estructural", 
        widthFormula: "W - 10", 
        heightFormula: "8",      
        depthFormula: "D - 10",     
        thicknessMM: 18, 
        quantity: 3, 
        sortOrder: 2, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: false,
        defaultMaterialCategory: "MELAMINA"
      },
      { 
        elementTypeId: meson.id, 
        componentType: "LATERAL",      
        label: "Seno o gotero", 
        widthFormula: "W", 
        heightFormula: "2",      
        depthFormula: "D + 2",     
        thicknessMM: 10, 
        quantity: 1, 
        sortOrder: 3, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: false 
      },
    ],
  });

  // ── ComponentTemplates para Módulo refrigerador ──────────────────────────
  await db.componentTemplate.deleteMany({ where: { elementTypeId: refrigerador.id } });
  await db.componentTemplate.createMany({
    data: [
      { 
        elementTypeId: refrigerador.id, 
        componentType: "LATERAL",   
        label: "Lateral izquierdo", 
        widthFormula: "D",     
        heightFormula: "H",      
        depthFormula: "D",     
        thicknessMM: 18, 
        quantity: 1, 
        sortOrder: 0, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: true,  
        rightEdge: false,
        defaultMaterialCategory: "MELAMINA"
      },
      { 
        elementTypeId: refrigerador.id, 
        componentType: "LATERAL",   
        label: "Lateral derecho", 
        widthFormula: "D",     
        heightFormula: "H",      
        depthFormula: "D",     
        thicknessMM: 18, 
        quantity: 1, 
        sortOrder: 1, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: true,
        defaultMaterialCategory: "MELAMINA"
      },
      { 
        elementTypeId: refrigerador.id, 
        componentType: "TECHO",     
        label: "Techo superior", 
        widthFormula: "W - 3.6", 
        heightFormula: "D",      
        depthFormula: "D",     
        thicknessMM: 18, 
        quantity: 1, 
        sortOrder: 2, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: false,
        defaultMaterialCategory: "MELAMINA"
      },
      { 
        elementTypeId: refrigerador.id, 
        componentType: "PISO",      
        label: "Base inferior", 
        widthFormula: "W - 3.6", 
        heightFormula: "D",      
        depthFormula: "D",     
        thicknessMM: 18, 
        quantity: 1, 
        sortOrder: 3, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: false,
        defaultMaterialCategory: "MELAMINA"
      },
      { 
        elementTypeId: refrigerador.id, 
        componentType: "FONDO",     
        label: "Fondo ventilado", 
        widthFormula: "W - 3.6", 
        heightFormula: "H - 3.6",      
        depthFormula: "D",     
        thicknessMM: 9, 
        quantity: 1, 
        sortOrder: 4, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: false 
      },
      { 
        elementTypeId: refrigerador.id, 
        componentType: "DIVISION",   
        label: "Rejilla ventilación", 
        widthFormula: "W - 20", 
        heightFormula: "15",      
        depthFormula: "D",     
        thicknessMM: 5, 
        quantity: 2, 
        sortOrder: 5, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: false 
      },
    ],
  });

  // ── ComponentTemplates para Módulo horno empotrado ───────────────────────
  await db.componentTemplate.deleteMany({ where: { elementTypeId: horno.id } });
  await db.componentTemplate.createMany({
    data: [
      { 
        elementTypeId: horno.id, 
        componentType: "LATERAL",   
        label: "Lateral izquierdo", 
        widthFormula: "D",     
        heightFormula: "H",      
        depthFormula: "D",     
        thicknessMM: 18, 
        quantity: 1, 
        sortOrder: 0, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: true,  
        rightEdge: false,
        defaultMaterialCategory: "MDF_LACADO"
      },
      { 
        elementTypeId: horno.id, 
        componentType: "LATERAL",   
        label: "Lateral derecho", 
        widthFormula: "D",     
        heightFormula: "H",      
        depthFormula: "D",     
        thicknessMM: 18, 
        quantity: 1, 
        sortOrder: 1, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: true,
        defaultMaterialCategory: "MDF_LACADO"
      },
      { 
        elementTypeId: horno.id, 
        componentType: "TECHO",     
        label: "Techo", 
        widthFormula: "W - 3.6", 
        heightFormula: "D",      
        depthFormula: "D",     
        thicknessMM: 18, 
        quantity: 1, 
        sortOrder: 2, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: false,
        defaultMaterialCategory: "MDF_LACADO"
      },
      { 
        elementTypeId: horno.id, 
        componentType: "PISO",      
        label: "Base", 
        widthFormula: "W - 3.6", 
        heightFormula: "D",      
        depthFormula: "D",     
        thicknessMM: 18, 
        quantity: 1, 
        sortOrder: 3, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: false,
        defaultMaterialCategory: "MDF_LACADO"
      },
      { 
        elementTypeId: horno.id, 
        componentType: "FONDO",     
        label: "Fondo ventilado", 
        widthFormula: "W - 3.6", 
        heightFormula: "H - 3.6",      
        depthFormula: "D",     
        thicknessMM: 9, 
        quantity: 1, 
        sortOrder: 4, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: false 
      },
      { 
        elementTypeId: horno.id, 
        componentType: "PUERTA",     
        label: "Marco frontal", 
        widthFormula: "W + 2", 
        heightFormula: "H + 2",      
        depthFormula: "D",     
        thicknessMM: 20, 
        quantity: 1, 
        sortOrder: 5, 
        topEdge: true,  
        bottomEdge: true,  
        leftEdge: true,  
        rightEdge: true,
        defaultMaterialCategory: "MDF_LACADO",
        defaultSurfaceFinishType: "LACADO"
      },
    ],
  });

  // ── ComponentTemplates para Panel de yeso / Drywall ──────────────────────
  await db.componentTemplate.deleteMany({ where: { elementTypeId: panelYeso.id } });
  await db.componentTemplate.createMany({
    data: [
      { 
        elementTypeId: panelYeso.id, 
        componentType: "LATERAL",     
        label: "Panel yeso cartón", 
        widthFormula: "W", 
        heightFormula: "H",      
        depthFormula: "D",     
        thicknessMM: 12, 
        quantity: 2, 
        sortOrder: 0, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: false,
        defaultMaterialCategory: "SUPERBOARD"
      },
      { 
        elementTypeId: panelYeso.id, 
        componentType: "RIEL",   
        label: "Perfilería metálica", 
        widthFormula: "W", 
        heightFormula: "H",      
        depthFormula: "D",     
        thicknessMM: 1, 
        quantity: 1, 
        sortOrder: 1, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: false 
      },
      { 
        elementTypeId: panelYeso.id, 
        componentType: "DIVISION",   
        label: "Aislante térmico", 
        widthFormula: "W", 
        heightFormula: "H",      
        depthFormula: "D",     
        thicknessMM: 50, 
        quantity: 1, 
        sortOrder: 2, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: false 
      },
      { 
        elementTypeId: panelYeso.id, 
        componentType: "TECHO",   
        label: "Acabado superior", 
        widthFormula: "W", 
        heightFormula: "1",      
        depthFormula: "D",     
        thicknessMM: 12, 
        quantity: 1, 
        sortOrder: 3, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: false 
      },
    ],
  });

  // ── Additional kitchen-specific element types ────────────────────────────
  
  // Create Campana (Range Hood)
  const campana = await db.elementType.upsert({
    where: { id: "seed-et-campana" },
    create: {
      id: "seed-et-campana",
      catalogId: (await db.catalog.findFirst())!.id,
      name: "Campana extractora",
      category: "ELECTRODOMESTICO",
      unit: "POR_UNIDAD",
      basePrice: 0,
      defaultWidth: 60,
      defaultHeight: 30,
      defaultDepth: 50,
      threeJsModel: "RangeHood",
      allowCustomWidth: true,
      allowCustomHeight: false,
      allowCustomDepth: false,
    },
    update: {},
  });

  await db.componentTemplate.deleteMany({ where: { elementTypeId: campana.id } });
  await db.componentTemplate.createMany({
    data: [
      { 
        elementTypeId: campana.id, 
        componentType: "LATERAL",   
        label: "Cuerpo principal", 
        widthFormula: "W", 
        heightFormula: "H",      
        depthFormula: "D",     
        thicknessMM: 1, 
        quantity: 1, 
        sortOrder: 0, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: false 
      },
      { 
        elementTypeId: campana.id, 
        componentType: "TECHO",   
        label: "Campana decorativa", 
        widthFormula: "W + 10", 
        heightFormula: "20",      
        depthFormula: "D + 10",     
        thicknessMM: 1, 
        quantity: 1, 
        sortOrder: 1, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: false,
        defaultMaterialCategory: "MDF_LACADO"
      },
    ],
  });

  // Create Cajonera (Drawer unit)
  const cajonera = await db.elementType.upsert({
    where: { id: "seed-et-cajonera" },
    create: {
      id: "seed-et-cajonera",
      catalogId: (await db.catalog.findFirst())!.id,
      name: "Cajonera estándar",
      category: "MUEBLE_BAJO",
      unit: "POR_UNIDAD",
      basePrice: 420000,
      defaultWidth: 45,
      defaultHeight: 72,
      defaultDepth: 55,
      threeJsModel: "DrawerUnit",
      allowCustomWidth: true,
      allowCustomHeight: false,
      allowCustomDepth: false,
    },
    update: {},
  });

  await db.componentTemplate.deleteMany({ where: { elementTypeId: cajonera.id } });
  await db.componentTemplate.createMany({
    data: [
      { 
        elementTypeId: cajonera.id, 
        componentType: "LATERAL",   
        label: "Lateral izquierdo", 
        widthFormula: "D",     
        heightFormula: "H - 8",      
        depthFormula: "D",     
        thicknessMM: 18, 
        quantity: 1, 
        sortOrder: 0, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: true,  
        rightEdge: false,
        defaultMaterialCategory: "MELAMINA"
      },
      { 
        elementTypeId: cajonera.id, 
        componentType: "LATERAL",   
        label: "Lateral derecho", 
        widthFormula: "D",     
        heightFormula: "H - 8",      
        depthFormula: "D",     
        thicknessMM: 18, 
        quantity: 1, 
        sortOrder: 1, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: true,
        defaultMaterialCategory: "MELAMINA"
      },
      { 
        elementTypeId: cajonera.id, 
        componentType: "FONDO",     
        label: "Fondo", 
        widthFormula: "W - 3.6", 
        heightFormula: "H - 8",      
        depthFormula: "D",     
        thicknessMM: 9, 
        quantity: 1, 
        sortOrder: 2, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: false 
      },
      { 
        elementTypeId: cajonera.id, 
        componentType: "PISO",      
        label: "Base", 
        widthFormula: "W - 3.6", 
        heightFormula: "D",      
        depthFormula: "D",     
        thicknessMM: 18, 
        quantity: 1, 
        sortOrder: 3, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: false,
        defaultMaterialCategory: "MELAMINA"
      },
      { 
        elementTypeId: cajonera.id, 
        componentType: "TECHO",     
        label: "Techo", 
        widthFormula: "W - 3.6", 
        heightFormula: "D",      
        depthFormula: "D",     
        thicknessMM: 18, 
        quantity: 1, 
        sortOrder: 4, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: false,
        defaultMaterialCategory: "MELAMINA"
      },
      { 
        elementTypeId: cajonera.id, 
        componentType: "CAJA_CAJON",     
        label: "Cajón grande", 
        widthFormula: "W - 10", 
        heightFormula: "25",      
        depthFormula: "D - 10",     
        thicknessMM: 15, 
        quantity: 2, 
        sortOrder: 5, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: false,
        defaultMaterialCategory: "MELAMINA"
      },
      { 
        elementTypeId: cajonera.id, 
        componentType: "CAJA_CAJON",     
        label: "Cajón pequeño", 
        widthFormula: "W - 10", 
        heightFormula: "15",      
        depthFormula: "D - 10",     
        thicknessMM: 15, 
        quantity: 1, 
        sortOrder: 6, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: false,
        defaultMaterialCategory: "MELAMINA"
      },
      { 
        elementTypeId: cajonera.id, 
        componentType: "FRENTE_CAJON",     
        label: "Frente cajón grande", 
        widthFormula: "W - 2", 
        heightFormula: "23",      
        depthFormula: "D",     
        thicknessMM: 18, 
        quantity: 2, 
        sortOrder: 7, 
        topEdge: true, 
        bottomEdge: true, 
        leftEdge: true, 
        rightEdge: true,
        defaultMaterialCategory: "MDF_LACADO",
        defaultSurfaceFinishType: "LACADO"
      },
      { 
        elementTypeId: cajonera.id, 
        componentType: "FRENTE_CAJON",     
        label: "Frente cajón pequeño", 
        widthFormula: "W - 2", 
        heightFormula: "13",      
        depthFormula: "D",     
        thicknessMM: 18, 
        quantity: 1, 
        sortOrder: 8, 
        topEdge: true, 
        bottomEdge: true, 
        leftEdge: true, 
        rightEdge: true,
        defaultMaterialCategory: "MDF_LACADO",
        defaultSurfaceFinishType: "LACADO"
      },
    ],
  });

  // Create Esquinero (Corner cabinet)
  const esquinero = await db.elementType.upsert({
    where: { id: "seed-et-esquinero" },
    create: {
      id: "seed-et-esquinero",
      catalogId: (await db.catalog.findFirst())!.id,
      name: "Mueble esquinero",
      category: "MUEBLE_BAJO",
      unit: "POR_UNIDAD",
      basePrice: 550000,
      defaultWidth: 90,
      defaultHeight: 72,
      defaultDepth: 90,
      threeJsModel: "CornerCabinet",
      allowCustomWidth: true,
      allowCustomHeight: false,
      allowCustomDepth: true,
    },
    update: {},
  });

  await db.componentTemplate.deleteMany({ where: { elementTypeId: esquinero.id } });
  await db.componentTemplate.createMany({
    data: [
      { 
        elementTypeId: esquinero.id, 
        componentType: "LATERAL",   
        label: "Lateral izquierdo", 
        widthFormula: "D",     
        heightFormula: "H - 8",      
        depthFormula: "D",     
        thicknessMM: 18, 
        quantity: 1, 
        sortOrder: 0, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: true,  
        rightEdge: false,
        defaultMaterialCategory: "MELAMINA"
      },
      { 
        elementTypeId: esquinero.id, 
        componentType: "LATERAL",   
        label: "Lateral derecho", 
        widthFormula: "D",     
        heightFormula: "H - 8",      
        depthFormula: "D",     
        thicknessMM: 18, 
        quantity: 1, 
        sortOrder: 1, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: true,
        defaultMaterialCategory: "MELAMINA"
      },
      { 
        elementTypeId: esquinero.id, 
        componentType: "DIVISION",   
        label: "Panel diagonal", 
        widthFormula: "D", 
        heightFormula: "H - 8",      
        depthFormula: "D",     
        thicknessMM: 18, 
        quantity: 1, 
        sortOrder: 2, 
        topEdge: true,  
        bottomEdge: true,  
        leftEdge: false, 
        rightEdge: false,
        defaultMaterialCategory: "MDF_LACADO"
      },
      { 
        elementTypeId: esquinero.id, 
        componentType: "FONDO",     
        label: "Fondo", 
        widthFormula: "W - 3.6", 
        heightFormula: "H - 8",      
        depthFormula: "D",     
        thicknessMM: 9, 
        quantity: 1, 
        sortOrder: 3, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: false 
      },
      { 
        elementTypeId: esquinero.id, 
        componentType: "ENTREPAÑO",    
        label: "Estante giratorio", 
        widthFormula: "min(W, D) - 10", 
        heightFormula: "D - 10",      
        depthFormula: "D",     
        thicknessMM: 18, 
        quantity: 2, 
        sortOrder: 4, 
        topEdge: false, 
        bottomEdge: false, 
        leftEdge: false, 
        rightEdge: false,
        defaultMaterialCategory: "MELAMINA"
      },
    ],
  });

  console.log("✅ Component templates seed completed successfully!");
  console.log(`   - Isla central: ${isla.name}`);
  console.log(`   - Mesón corrido: ${meson.name}`);
  console.log(`   - Módulo refrigerador: ${refrigerador.name}`);
  console.log(`   - Módulo horno: ${horno.name}`);
  console.log(`   - Panel Drywall: ${panelYeso.name}`);
  console.log(`   - Campana extractora: ${campana.name}`);
  console.log(`   - Cajonera: ${cajonera.name}`);
  console.log(`   - Mueble esquinero: ${esquinero.name}`);
}

main()
  .catch(e => {
    console.error("❌ Error seeding component templates:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());