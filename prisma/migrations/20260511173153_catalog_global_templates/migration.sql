-- DropForeignKey
ALTER TABLE "Catalog" DROP CONSTRAINT "Catalog_userId_fkey";

-- AlterTable
ALTER TABLE "AssemblySupply" ADD COLUMN     "isTemplate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceId" TEXT;

-- AlterTable
ALTER TABLE "Catalog" ADD COLUMN     "isGlobal" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "EdgeTreatment" ADD COLUMN     "isTemplate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceId" TEXT;

-- AlterTable
ALTER TABLE "ElementType" ADD COLUMN     "isTemplate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceId" TEXT;

-- AlterTable
ALTER TABLE "Finish" ADD COLUMN     "isTemplate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceId" TEXT;

-- AlterTable
ALTER TABLE "Hardware" ADD COLUMN     "isTemplate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceId" TEXT;

-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "isTemplate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceId" TEXT;

-- AlterTable
ALTER TABLE "SurfaceFinish" ADD COLUMN     "isTemplate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceId" TEXT;

-- CreateIndex
CREATE INDEX "AssemblySupply_sourceId_idx" ON "AssemblySupply"("sourceId");

-- CreateIndex
CREATE INDEX "EdgeTreatment_sourceId_idx" ON "EdgeTreatment"("sourceId");

-- CreateIndex
CREATE INDEX "ElementType_sourceId_idx" ON "ElementType"("sourceId");

-- CreateIndex
CREATE INDEX "Finish_sourceId_idx" ON "Finish"("sourceId");

-- CreateIndex
CREATE INDEX "Hardware_sourceId_idx" ON "Hardware"("sourceId");

-- CreateIndex
CREATE INDEX "Material_sourceId_idx" ON "Material"("sourceId");

-- CreateIndex
CREATE INDEX "SurfaceFinish_sourceId_idx" ON "SurfaceFinish"("sourceId");

-- AddForeignKey
ALTER TABLE "Catalog" ADD CONSTRAINT "Catalog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
