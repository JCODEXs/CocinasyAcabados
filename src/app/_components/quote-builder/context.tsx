"use client";

import {
  createContext, useContext, useState,
  useCallback, type ReactNode,
} from "react";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";

type Project  = RouterOutputs["quotes"]["getProject"];
type Catalog  = RouterOutputs["catalog"]["getFullCatalog"];

type Selection =
  | { type: "item";      quoteItemId: string }
  | { type: "component"; componentId: string }
  | { type: "group";     groupId:     string }
  | null;

interface QuoteBuilderCtx {
  projectId:        string;
  // Data — read from cache, never from local state
  project:          Project | undefined;
  catalog:          Catalog | undefined;
  isLoadingProject: boolean;
  // UI state
  selection:        Selection;
  select:           (s: Selection) => void;
  selectedGroupId:  string | null;
  setSelectedGroupId: (id: string | null) => void;
  rightPanel:       "details" | "hardware" | "finishes";
  setRightPanel:    (p: "details" | "hardware" | "finishes") => void;
  // Cache operations
  invalidateProject: () => Promise<void>;
  refetchProject:    () => Promise<void>;
}

const Ctx = createContext<QuoteBuilderCtx | null>(null);

export function QuoteBuilderProvider({
  children,
  projectId,
  initialProject,
  initialCatalog,
}: {
  children:        ReactNode;
  projectId:       string;
  initialProject:  Project;
  initialCatalog:  Catalog | null;
}) {
  const utils = api.useUtils();

  // ── UI state only ────────────────────────────────────────────────────────
  const [selection,       setSelection]       = useState<Selection>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [rightPanel,      setRightPanel]      = useState<"details" | "hardware" | "finishes">("details");

  // ── Data from cache — single source of truth ─────────────────────────────
  const { data: project, isLoading: isLoadingProject } = api.quotes.getProject.useQuery(
    { id: projectId },
    {
      initialData:          initialProject,
      staleTime:            20 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  const { data: catalog } = api.catalog.getFullCatalog.useQuery(undefined, {
    initialData:          initialCatalog ?? undefined,
    staleTime:            10 * 60 * 1000,
    gcTime:               30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // ── Cache operations ──────────────────────────────────────────────────────
  const invalidateProject = useCallback(async () => {
    await utils.quotes.getProject.invalidate({ id: projectId });
  }, [utils, projectId]);

  const refetchProject = useCallback(async () => {
    await utils.quotes.getProject.refetch({ id: projectId });
  }, [utils, projectId]);

  const select = useCallback((s: Selection) => setSelection(s), []);

  return (
    <Ctx.Provider value={{
      projectId,
      project,
      catalog,
      isLoadingProject,
      selection,
      select,
      selectedGroupId,
      setSelectedGroupId,
      rightPanel,
      setRightPanel,
      invalidateProject,
      refetchProject,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useQuoteBuilder() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useQuoteBuilder must be inside QuoteBuilderProvider");
  return ctx;
}