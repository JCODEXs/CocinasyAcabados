-- CreateEnum
CREATE TYPE "Role" AS ENUM ('INSTALLER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ElementCategory" AS ENUM ('MUEBLE_BAJO', 'MUEBLE_ALTO', 'MESON', 'ELECTRODOMESTICO', 'PANEL_YESO', 'SUPERBOARD', 'PUERTA', 'ESTANTE', 'OTRO');

-- CreateEnum
CREATE TYPE "PricingUnit" AS ENUM ('POR_ML', 'POR_M2', 'POR_UNIDAD');

-- CreateEnum
CREATE TYPE "MaterialCategory" AS ENUM ('MADERA_NATURAL', 'MDF_LACADO', 'MELAMINA', 'GRANITO', 'MARMOL', 'CUARZO', 'CERAMICA', 'PANEL_YESO', 'SUPERBOARD', 'OTRO');

-- CreateEnum
CREATE TYPE "HardwareCategory" AS ENUM ('BISAGRA', 'RIEL_CAJON', 'JALADOR', 'CORREDERA', 'PATAS_NIVELADORA', 'BISAGRA_PIANO', 'AMORTIGUADOR', 'CERRADURA', 'CLIP_ESTANTE', 'OTRO');

-- CreateEnum
CREATE TYPE "QualityTier" AS ENUM ('ECONOMICO', 'ESTANDAR', 'PREMIUM', 'LUJO');

-- CreateEnum
CREATE TYPE "SurfaceFinishType" AS ENUM ('LACADO', 'CHAPA_MADERA', 'MELAMINA', 'VINILO_ADHESIVO', 'PINTURA', 'BARNIZ', 'SIN_ACABADO');

-- CreateEnum
CREATE TYPE "EdgeType" AS ENUM ('CANTO_MELAMINA', 'CANTO_PVC', 'PERFIL_ALUMINIO', 'CHAFLAN_45', 'MEDIA_CANNA', 'MOLDURA', 'POSTFORMADO', 'SIN_CANTO');

-- CreateEnum
CREATE TYPE "SupplyCategory" AS ENUM ('TORNILLO', 'TARUGO', 'PEGANTE', 'SEPARADOR', 'ANCLAJE', 'PERFIL_UNION', 'MECANIZADO', 'OTRO');

-- CreateEnum
CREATE TYPE "ComponentType" AS ENUM ('LATERAL', 'FONDO', 'TECHO', 'PISO', 'ENTREPAÑO', 'PUERTA', 'FRENTE_CAJON', 'CAJA_CAJON', 'MESON', 'ZOCALO', 'DIVISION', 'RIEL');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'SENT', 'REVIEWING', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "EdgeSide" AS ENUM ('TOP', 'BOTTOM', 'LEFT', 'RIGHT');

-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('WALL_RUN', 'ISLAND', 'PENINSULA', 'L_SHAPE', 'U_SHAPE', 'STANDALONE');

-- CreateEnum
CREATE TYPE "ConnectionType" AS ENUM ('INLINE', 'CORNER_90R', 'CORNER_90L', 'CORNER_45', 'GAP', 'END');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "refresh_token_expires_in" INTEGER,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'INSTALLER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Catalog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElementType" (
    "id" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ElementCategory" NOT NULL,
    "unit" "PricingUnit" NOT NULL,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "defaultWidth" DOUBLE PRECISION,
    "defaultHeight" DOUBLE PRECISION,
    "defaultDepth" DOUBLE PRECISION,
    "threeJsModel" TEXT NOT NULL,
    "allowCustomWidth" BOOLEAN NOT NULL DEFAULT true,
    "allowCustomHeight" BOOLEAN NOT NULL DEFAULT false,
    "allowCustomDepth" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ElementType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "MaterialCategory" NOT NULL,
    "pricePerM2" DECIMAL(10,2) NOT NULL,
    "thicknessMM" INTEGER NOT NULL DEFAULT 18,
    "textureUrl" TEXT,
    "roughnessMap" TEXT,
    "normalMap" TEXT,
    "color" TEXT,
    "aiDescription" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hardware" (
    "id" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "HardwareCategory" NOT NULL,
    "qualityTier" "QualityTier" NOT NULL,
    "brand" TEXT,
    "pricePerUnit" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'und',
    "description" TEXT,
    "imageUrl" TEXT,
    "threeDModel" TEXT,

    CONSTRAINT "Hardware_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurfaceFinish" (
    "id" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SurfaceFinishType" NOT NULL,
    "pricePerM2" DECIMAL(10,2) NOT NULL,
    "textureUrl" TEXT,
    "roughnessMap" TEXT,
    "normalMap" TEXT,
    "color" TEXT,
    "aiDescription" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SurfaceFinish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EdgeTreatment" (
    "id" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EdgeType" NOT NULL,
    "pricePerML" DECIMAL(10,2) NOT NULL,
    "thicknessMM" INTEGER,
    "description" TEXT,

    CONSTRAINT "EdgeTreatment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssemblySupply" (
    "id" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "SupplyCategory" NOT NULL,
    "unit" TEXT NOT NULL,
    "pricePerUnit" DECIMAL(10,2) NOT NULL,
    "autoCalcRule" TEXT,

    CONSTRAINT "AssemblySupply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finish" (
    "id" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pricePerM2" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'm²',

    CONSTRAINT "Finish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentTemplate" (
    "id" TEXT NOT NULL,
    "elementTypeId" TEXT NOT NULL,
    "componentType" "ComponentType" NOT NULL,
    "label" TEXT,
    "widthFormula" TEXT NOT NULL,
    "heightFormula" TEXT NOT NULL,
    "thicknessMM" INTEGER NOT NULL DEFAULT 18,
    "depthFormula" TEXT NOT NULL DEFAULT 'D',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "topEdge" BOOLEAN NOT NULL DEFAULT false,
    "bottomEdge" BOOLEAN NOT NULL DEFAULT false,
    "leftEdge" BOOLEAN NOT NULL DEFAULT false,
    "rightEdge" BOOLEAN NOT NULL DEFAULT false,
    "defaultMaterialCategory" "MaterialCategory",
    "defaultSurfaceFinishType" "SurfaceFinishType",

    CONSTRAINT "ComponentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "roomWidth" DOUBLE PRECISION,
    "roomLength" DOUBLE PRECISION,
    "roomHeight" DOUBLE PRECISION,
    "notes" TEXT,
    "shareToken" TEXT NOT NULL,
    "shareExpiry" TIMESTAMP(3),
    "referenceImageUrl" TEXT,
    "aiRenderUrl" TEXT,
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "elementTypeId" TEXT NOT NULL,
    "label" TEXT,
    "layoutGroupId" TEXT,
    "groupOrder" INTEGER NOT NULL DEFAULT 0,
    "connectionToNext" "ConnectionType" NOT NULL DEFAULT 'INLINE',
    "gapBeforeCm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "posX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "posY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "posZ" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rotationY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "depth" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteItemComponent" (
    "id" TEXT NOT NULL,
    "quoteItemId" TEXT NOT NULL,
    "componentType" "ComponentType" NOT NULL,
    "label" TEXT,
    "widthCm" DOUBLE PRECISION NOT NULL,
    "heightCm" DOUBLE PRECISION NOT NULL,
    "thicknessMM" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "materialId" TEXT,
    "surfaceFinishId" TEXT,
    "boardAreaM2" DOUBLE PRECISION NOT NULL,
    "finishAreaM2" DOUBLE PRECISION NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "QuoteItemComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentEdge" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "edgeTreatmentId" TEXT NOT NULL,
    "edgeSide" "EdgeSide" NOT NULL,
    "lengthML" DOUBLE PRECISION NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "ComponentEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HardwareItem" (
    "id" TEXT NOT NULL,
    "quoteItemId" TEXT NOT NULL,
    "hardwareId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "HardwareItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteItemSupply" (
    "id" TEXT NOT NULL,
    "quoteItemId" TEXT NOT NULL,
    "assemblySupplyId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "QuoteItemSupply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectFinish" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "finishId" TEXT NOT NULL,
    "areaM2" DOUBLE PRECISION NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "ProjectFinish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LayoutGroup" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "GroupType" NOT NULL,
    "startX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "baseAngle" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LayoutGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Catalog_userId_key" ON "Catalog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_shareToken_key" ON "Project"("shareToken");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Catalog" ADD CONSTRAINT "Catalog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElementType" ADD CONSTRAINT "ElementType_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "Catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "Catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hardware" ADD CONSTRAINT "Hardware_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "Catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurfaceFinish" ADD CONSTRAINT "SurfaceFinish_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "Catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EdgeTreatment" ADD CONSTRAINT "EdgeTreatment_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "Catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssemblySupply" ADD CONSTRAINT "AssemblySupply_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "Catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finish" ADD CONSTRAINT "Finish_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "Catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentTemplate" ADD CONSTRAINT "ComponentTemplate_elementTypeId_fkey" FOREIGN KEY ("elementTypeId") REFERENCES "ElementType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_elementTypeId_fkey" FOREIGN KEY ("elementTypeId") REFERENCES "ElementType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_layoutGroupId_fkey" FOREIGN KEY ("layoutGroupId") REFERENCES "LayoutGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItemComponent" ADD CONSTRAINT "QuoteItemComponent_quoteItemId_fkey" FOREIGN KEY ("quoteItemId") REFERENCES "QuoteItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItemComponent" ADD CONSTRAINT "QuoteItemComponent_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItemComponent" ADD CONSTRAINT "QuoteItemComponent_surfaceFinishId_fkey" FOREIGN KEY ("surfaceFinishId") REFERENCES "SurfaceFinish"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentEdge" ADD CONSTRAINT "ComponentEdge_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "QuoteItemComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentEdge" ADD CONSTRAINT "ComponentEdge_edgeTreatmentId_fkey" FOREIGN KEY ("edgeTreatmentId") REFERENCES "EdgeTreatment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HardwareItem" ADD CONSTRAINT "HardwareItem_quoteItemId_fkey" FOREIGN KEY ("quoteItemId") REFERENCES "QuoteItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HardwareItem" ADD CONSTRAINT "HardwareItem_hardwareId_fkey" FOREIGN KEY ("hardwareId") REFERENCES "Hardware"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItemSupply" ADD CONSTRAINT "QuoteItemSupply_quoteItemId_fkey" FOREIGN KEY ("quoteItemId") REFERENCES "QuoteItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItemSupply" ADD CONSTRAINT "QuoteItemSupply_assemblySupplyId_fkey" FOREIGN KEY ("assemblySupplyId") REFERENCES "AssemblySupply"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFinish" ADD CONSTRAINT "ProjectFinish_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFinish" ADD CONSTRAINT "ProjectFinish_finishId_fkey" FOREIGN KEY ("finishId") REFERENCES "Finish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LayoutGroup" ADD CONSTRAINT "LayoutGroup_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
