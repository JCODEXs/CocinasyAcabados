/*
  Warnings:

  - The `CutX` column on the `QuoteItemComponent` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `CutY` column on the `QuoteItemComponent` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "QuoteItemComponent" DROP COLUMN "CutX",
ADD COLUMN     "CutX" DOUBLE PRECISION DEFAULT 35,
DROP COLUMN "CutY",
ADD COLUMN     "CutY" DOUBLE PRECISION DEFAULT 35;
