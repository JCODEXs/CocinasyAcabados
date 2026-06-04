-- DropForeignKey
ALTER TABLE "QuoteItem" DROP CONSTRAINT "QuoteItem_layoutGroupId_fkey";

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_layoutGroupId_fkey" FOREIGN KEY ("layoutGroupId") REFERENCES "LayoutGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
