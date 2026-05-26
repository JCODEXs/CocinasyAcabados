-- AlterTable
ALTER TABLE "ComponentTemplate" ADD COLUMN     "posXFormula" TEXT NOT NULL DEFAULT '0',
ADD COLUMN     "posYFormula" TEXT NOT NULL DEFAULT 'H / 2',
ADD COLUMN     "posZFormula" TEXT NOT NULL DEFAULT '0';
