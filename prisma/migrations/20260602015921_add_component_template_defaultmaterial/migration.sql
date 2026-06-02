-- AlterTable
ALTER TABLE "ComponentTemplate" ADD COLUMN     "materialId" TEXT NOT NULL DEFAULT 'cmpvummbr000qsckeetg9776v';

-- AddForeignKey
ALTER TABLE "ComponentTemplate" ADD CONSTRAINT "ComponentTemplate_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
