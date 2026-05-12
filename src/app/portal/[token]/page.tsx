import { api } from "@/trpc/server";
import { notFound } from "next/navigation";
import { PortalClient } from "./PortalClient";
import { serializeDecimals } from "@/server/lib/serialize";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function PortalPage({
  params,
}: PageProps) {
    const paramsResolved = await params;
const token = paramsResolved?.token;
    // console.log(token,"token")
  const project = await api.portal.getByToken({ token: token }).catch(() => null);
  if (!project) notFound();
  const safeProject=serializeDecimals(project)

  return <PortalClient project={safeProject} token={token} />;
}

export async function generateMetadata({ params }: PageProps) {
    const paramsResolved = await params;
const token = paramsResolved?.token;

  const project = await api.portal.getByToken({ token: token }).catch(() => null);
  return {
    title: project ? `Cotización — ${project.name}` : "Cotización no encontrada",
    description: "Revisa y personaliza tu proyecto de cocina",
  };
}