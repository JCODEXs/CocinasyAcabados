/*
  Warnings:

  - You are about to drop the column `threeJsModel` on the `ElementType` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ElementType" DROP COLUMN "threeJsModel",
ADD COLUMN     "thicknessMM" DOUBLE PRECISION DEFAULT 18;
