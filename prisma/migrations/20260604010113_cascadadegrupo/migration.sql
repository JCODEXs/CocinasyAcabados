/*
  Warnings:

  - Made the column `layoutGroupId` on table `QuoteItem` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "QuoteItem" ALTER COLUMN "layoutGroupId" SET NOT NULL;
