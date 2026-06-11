/*
  Warnings:

  - The `CutX` column on the `ComponentTemplate` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `CutY` column on the `ComponentTemplate` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "ComponentTemplate" DROP COLUMN "CutX",
ADD COLUMN     "CutX" DOUBLE PRECISION NOT NULL DEFAULT 0,
DROP COLUMN "CutY",
ADD COLUMN     "CutY" DOUBLE PRECISION NOT NULL DEFAULT 0;
