-- AlterTable
ALTER TABLE "QuoteItemComponent" ADD COLUMN     "CutX" TEXT NOT NULL DEFAULT 'CX',
ADD COLUMN     "CutY" TEXT NOT NULL DEFAULT 'CY',
ADD COLUMN     "cornerToCut" TEXT NOT NULL DEFAULT 'bottom-left';
