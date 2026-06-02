/*
  Warnings:

  - Added the required column `componentTemplateId` to the `QuoteItemComponent` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "QuoteItemComponent" ADD COLUMN     "componentTemplateId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "QuoteItemComponent" ADD CONSTRAINT "QuoteItemComponent_componentTemplateId_fkey" FOREIGN KEY ("componentTemplateId") REFERENCES "ComponentTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
