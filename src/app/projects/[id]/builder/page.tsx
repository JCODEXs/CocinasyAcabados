/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { api }               from "@/trpc/server";
import { notFound }          from "next/navigation";
import { serializeDecimals } from "@/server/lib/serialize";
import { QuoteBuilderProvider } from "@/app/_components/quote-builder/context";
import { QuoteBuilderShell }    from "@/app/_components/quote-builder/QuoteBuilderShell";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BuilderPage({ params }: PageProps) {
  const { id } = await params;

  const [project, catalog] = await Promise.all([
    api.quotes.getProject({ id }).catch(() => null),
    api.catalog.getFullCatalog().catch(() => null),
  ]);

  if (!project) notFound();

  return (
    <QuoteBuilderProvider
      projectId={id}
      initialProject={serializeDecimals(project)}
      initialCatalog={serializeDecimals(catalog)}
    >
      <QuoteBuilderShell />
    </QuoteBuilderProvider>
  );
}