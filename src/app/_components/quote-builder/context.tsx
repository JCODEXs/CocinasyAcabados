"use client";

import {
  createContext, useContext, useState, useCallback, type ReactNode,
} from "react";
import { api } from "@/trpc/react";

// ─── Tipos de selección activa ──────────────────────────────────────────────

type Selection =
  | { type: "item"; quoteItemId: string }
  | { type: "component"; componentId: string }
  | { type: "group"; groupId: string }
  | null;

interface QuoteBuilderCtx {
  projectId: string;
  selection: Selection;
  select: (s: Selection) => void;
  clearSelection: () => void;
  // Panel derecho activo
  rightPanel: "details" | "hardware" | "finishes";
  setRightPanel: (p: "details" | "hardware" | "finishes") => void;
  // Trigger de refresco manual (post-mutación)
  invalidate: () => void;
}

const Ctx = createContext<QuoteBuilderCtx | null>(null);

export function QuoteBuilderProvider({
  children,
  projectId,
}: {
  children: ReactNode;
  projectId: string;
}) {
  const utils = api.useUtils();
  const [selection, setSelection] = useState<Selection>(null);
  const [rightPanel, setRightPanel] = useState<"details" | "hardware" | "finishes">("details");

  const select = useCallback((s: Selection) => setSelection(s), []);
  const clearSelection = useCallback(() => setSelection(null), []);

  const invalidate = useCallback(() => {
    void utils.quotes.getProject.invalidate({ id: projectId });
  }, [utils, projectId]);

  return (
    <Ctx.Provider value={{ projectId, selection, select, clearSelection, rightPanel, setRightPanel, invalidate }}>
      {children}
    </Ctx.Provider>
  );
}

export function useQuoteBuilder() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useQuoteBuilder debe usarse dentro de QuoteBuilderProvider");
  return ctx;
}