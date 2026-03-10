"use client";

import { useState, useCallback } from "react";
import type { WorkoutSet, Exercise, MuscleGroup } from "@/lib/types";
import { MUSCLE_GROUP_LABELS } from "@/lib/types";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dumbbell,
  ChevronUp,
  ChevronDown,
  Trash2,
  GripVertical,
  CircleCheck,
} from "lucide-react";

interface SortableExerciseListProps {
  entries: [string, WorkoutSet[]][];
  exerciseMap: Map<string, Exercise>;
  expandedExercises: Set<string>;
  onEditExercise: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onDeleteExercise: (id: string) => void;
  onReorder: (newOrder: string[]) => void;
}

function SortableExerciseCard({
  exerciseId,
  exSets,
  exercise,
  isExpanded,
  onEdit,
  onToggleExpand,
  onDelete,
}: {
  exerciseId: string;
  exSets: WorkoutSet[];
  exercise: Exercise | undefined;
  isExpanded: boolean;
  onEdit: () => void;
  onToggleExpand: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exerciseId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const completedCount = exSets.filter((s) => s.completed).length;
  const allCompleted = completedCount === exSets.length && exSets.length > 0;

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="overflow-hidden" data-testid={`card-exercise-${exerciseId}`}>
        <div className="flex items-center gap-2 px-1 py-2.5">
          <button
            className="flex items-center justify-center w-8 h-8 shrink-0 cursor-grab active:cursor-grabbing touch-none text-muted-foreground/50"
            {...attributes}
            {...listeners}
            data-testid={`drag-handle-${exerciseId}`}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div
            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer active:bg-muted/30 transition-colors rounded-md px-1.5 py-0.5"
            onClick={onEdit}
            data-testid={`button-exercise-card-${exerciseId}`}
          >
            <div className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${allCompleted ? "bg-emerald-500/10" : "bg-primary/10"}`}>
              {allCompleted ? (
                <CircleCheck className="h-4 w-4 text-emerald-500" />
              ) : (
                <Dumbbell className="h-3.5 w-3.5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {exercise?.name || "알 수 없는 운동"}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {exercise?.muscle_group && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                    {MUSCLE_GROUP_LABELS[exercise.muscle_group as MuscleGroup] || exercise.muscle_group}
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {allCompleted
                    ? `${exSets.length}세트`
                    : `${completedCount} / ${exSets.length}세트`}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between px-3.5 py-1.5 border-t border-muted/40">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1 text-muted-foreground"
            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
            data-testid={`button-toggle-expand-${exerciseId}`}
          >
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {isExpanded ? "접기" : "펼치기"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            data-testid={`button-delete-exercise-${exerciseId}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            삭제
          </Button>
        </div>
        {isExpanded && (
          <div className="px-3.5 py-1.5 border-t border-muted/40 bg-muted/20">
            <div className="grid grid-cols-3 gap-0 text-[10px] font-medium text-muted-foreground uppercase tracking-wider pb-1">
              <span>세트</span><span>횟수 / 무게</span><span>휴식</span>
            </div>
            {exSets.map((s) => (
              <div key={s.id} className="grid grid-cols-3 gap-0 text-sm py-1 border-t border-muted/30" data-testid={`row-set-${s.id}`}>
                <span className="font-mono text-xs text-muted-foreground">{s.set_number}</span>
                <span className="text-xs">
                  {s.reps ?? "-"}회 / {s.weight ? `${Number(s.weight)}kg` : "-"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {s.rest_seconds
                    ? `${String(Math.floor(s.rest_seconds / 100)).padStart(2, "0")}:${String(s.rest_seconds % 100).padStart(2, "0")}`
                    : "-"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export function SortableExerciseList({
  entries,
  exerciseMap,
  expandedExercises,
  onEditExercise,
  onToggleExpand,
  onDeleteExercise,
  onReorder,
}: SortableExerciseListProps) {
  const exerciseIds = entries.map(([id]) => id);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = exerciseIds.indexOf(active.id as string);
      const newIndex = exerciseIds.indexOf(over.id as string);
      const newOrder = arrayMove(exerciseIds, oldIndex, newIndex);
      onReorder(newOrder);
    },
    [exerciseIds, onReorder]
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={exerciseIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {entries.map(([exerciseId, exSets]) => (
            <SortableExerciseCard
              key={exerciseId}
              exerciseId={exerciseId}
              exSets={exSets}
              exercise={exerciseMap.get(exerciseId)}
              isExpanded={expandedExercises.has(exerciseId)}
              onEdit={() => onEditExercise(exerciseId)}
              onToggleExpand={() => onToggleExpand(exerciseId)}
              onDelete={() => onDeleteExercise(exerciseId)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
