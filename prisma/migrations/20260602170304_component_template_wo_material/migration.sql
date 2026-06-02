/*
  Warnings:

  - You are about to drop the column `materialId` on the `ComponentTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `componentTemplateId` on the `QuoteItemComponent` table. All the data in the column will be lost.
  - Added the required column `heightFormula` to the `QuoteItemComponent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `widthFormula` to the `QuoteItemComponent` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ComponentTemplate" DROP CONSTRAINT "ComponentTemplate_materialId_fkey";

-- DropForeignKey
ALTER TABLE "QuoteItemComponent" DROP CONSTRAINT "QuoteItemComponent_componentTemplateId_fkey";

-- AlterTable
ALTER TABLE "ComponentTemplate" DROP COLUMN "materialId";

-- AlterTable
ALTER TABLE "QuoteItemComponent" DROP COLUMN "componentTemplateId",
ADD COLUMN     "bottomEdge" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "depthFormula" TEXT NOT NULL DEFAULT 'D',
ADD COLUMN     "heightFormula" TEXT NOT NULL,
ADD COLUMN     "leftEdge" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "posXFormula" TEXT NOT NULL DEFAULT '0',
ADD COLUMN     "posYFormula" TEXT NOT NULL DEFAULT 'H / 2',
ADD COLUMN     "posZFormula" TEXT NOT NULL DEFAULT '0',
ADD COLUMN     "rightEdge" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "topEdge" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "widthFormula" TEXT NOT NULL;
