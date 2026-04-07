"use client";

import { useState } from "react";
import { type RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";
import { useQuoteBuilder } from "./context";
import { QuoteItemCard } from "./QuoteItemCard";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Bars3Icon, ChevronDownIcon, ChevronRightIcon,
  PencilIcon, TrashIcon,
} from "@heroicons/react/24/outline";
import { ConnectionType } from "@prisma/client";

type Group = RouterOutputs["quotes"]["getProject"]["layoutGroups"][number];

const GROUP_TYPE_BADGE: Record<string, string> = {
  WALL_RUN: "Pared", L_SHAPE: "L", U_SHAPE: "U",
  ISLAND: "Isla", PENINSULA: "Península", STANDALONE: "Ind.",
};

export function LayoutGroupPanel({ group }: { group: Group }) {
  const { invalidate } = useQuoteBuilder();
  const [collapsed, setCollapsed] = useState(false);
  const [items, setItems] = useState(group.items);

  const reorder = api.layout.reorderItems.useMutation({ onSuccess: invalidate });
  const deleteGroup = api.layout.deleteGroup.useMutation({ onSuccess: invalidate });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = items.findIndex(i => i.id === active.id);
    const newIdx = items.findIndex(i => i.id === over.id);
    const reordered = arrayMove(items, oldIdx, newIdx);
    setItems(reordered); // optimistic

    reorder.mutate({
      groupId: group.id,
      orderedIds: reordered.map((item, idx) => ({
        id: item.id,
        groupOrder: idx,
        connectionToNext: idx < reordered.length - 1
          ? item.connectionToNext as ConnectionType
          : "END" as ConnectionType,
      })),
    });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* ── Header del grupo ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2.5 dark:border-gray-800">
        <button onClick={() => setCollapsed(c => !c)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          {collapsed
            ? <ChevronRightIcon className="h-4 w-4" />
            : <ChevronDownIcon className="h-4 w-4" />
          }
        </button>

        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          {GROUP_TYPE_BADGE[group.type] ?? group.type}
        </span>

        <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">
          {group.name}
        </span>

        <span className="text-xs text-gray-400">
          {items.length} {items.length === 1 ? "elemento" : "elementos"}
        </span>

        <button
          onClick={() => { if (confirm(`¿Eliminar grupo "${group.name}"?`)) deleteGroup.mutate({ id: group.id }); }}
          className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Items con drag-reorder ────────────────────────────────────── */}
      {!collapsed && (
        <div className="p-2 space-y-1.5">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              {items.map((item, idx) => (
                <SortableQuoteItemWrapper
                  key={item.id}
                  item={item}
                  isLast={idx === items.length - 1}
                />
              ))}
            </SortableContext>
          </DndContext>

          {items.length === 0 && (
            <p className="py-4 text-center text-xs text-gray-400">
              Agrega elementos desde el catálogo
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Wrapper sortable ─────────────────────────────────────────────────────────

function SortableQuoteItemWrapper({
  item,
  isLast,
}: {
  item: Group["items"][number];
  isLast: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Handle de arrastre */}
      <button
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab touch-none text-gray-300 active:cursor-grabbing dark:text-gray-600"
      >
        <Bars3Icon className="h-4 w-4" />
      </button>

      <div className="ml-5">
        <QuoteItemCard item={item} />
      </div>

      {/* Conector visual entre items */}
      {!isLast && <ConnectionBadge connection={item.connectionToNext} gap={item.gapBeforeCm} />}
    </div>
  );
}

function ConnectionBadge({ connection, gap }: { connection: string; gap: number }) {
  const labels: Record<string, string> = {
    INLINE: "→", CORNER_90R: "↱ 90° der", CORNER_90L: "↰ 90° izq",
    CORNER_45: "↱ 45°", GAP: `← ${gap}cm →`, END: "",
  };
  const label = labels[connection] ?? connection;
  if (!label) return null;

  return (
    <div className="my-0.5 ml-5 flex items-center gap-2">
      <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
      <span className="rounded bg-gray-50 px-2 py-0.5 text-xs text-gray-400 dark:bg-gray-800/50 dark:text-gray-500">
        {label}
      </span>
      <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}