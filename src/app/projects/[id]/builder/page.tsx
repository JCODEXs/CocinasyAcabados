import { api } from "@/trpc/server";
import { notFound } from "next/navigation";
import { QuoteBuilderProvider } from "@/app/_components/quote-builder/context";
import { QuoteBuilderShell } from "@/app/_components/quote-builder/QuoteBuilderShell";

export default async function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
  // Prefetch server-side para evitar loading flash
  const id = await params.id
  console.log(id)
  const project = await api.quotes.getProject({ id }).catch(() => null);
  if (!project) notFound();

  const catalog = await api.catalog.getFullCatalog();

  return (
    <QuoteBuilderProvider projectId={id}>
      <QuoteBuilderShell initialProject={project} initialCatalog={catalog} />
    </QuoteBuilderProvider>
  );
}