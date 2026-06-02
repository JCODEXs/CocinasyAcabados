/*
  Warnings:

  - Made the column `thicknessMM` on table `ElementType` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ElementType" ADD COLUMN     "backThicknessMM" DOUBLE PRECISION NOT NULL DEFAULT 15,
ADD COLUMN     "zocalo" DOUBLE PRECISION NOT NULL DEFAULT 8,
ALTER COLUMN "thicknessMM" SET NOT NULL;
