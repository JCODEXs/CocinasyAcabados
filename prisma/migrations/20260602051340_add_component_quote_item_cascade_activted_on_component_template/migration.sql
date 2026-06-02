-- DropForeignKey
ALTER TABLE "QuoteItemComponent" DROP CONSTRAINT "QuoteItemComponent_componentTemplateId_fkey";

-- AddForeignKey
ALTER TABLE "QuoteItemComponent" ADD CONSTRAINT "QuoteItemComponent_componentTemplateId_fkey" FOREIGN KEY ("componentTemplateId") REFERENCES "ComponentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
