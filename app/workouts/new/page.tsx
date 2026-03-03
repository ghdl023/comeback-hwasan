"use client";

import { useAuth } from "@/components/auth-provider";
import { addWorkout, addWorkoutSets } from "@/lib/firebase/firestore";
import type { Exercise } from "@/lib/types";
import { MUSCLE_GROUP_LABELS, type MuscleGroup } from "@/lib/types";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ExerciseSelector } from "@/components/exercise-selector";
import {
  Loader2,
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  GripVertical,
} from "lucide-react";
import Link from "next/link";

interface SetEntry {
  tempId: string;
  exercise_id: string;
  exercise_name: string;
  set_number: number;
  reps: string;
  weight: string;
}

interface ExerciseGroup {
  exercise: Exercise;
  sets: SetEntry[];
}

export default function NewWorkoutPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectorOpen, setSelectorOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [performedAt, setPerformedAt] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [durationMinutes, setDurationMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [exerciseGroups, setExerciseGroups] = useState<ExerciseGroup[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  const handleExercisesSelected = (exercises: Exercise[]) => {
    setExerciseGroups((prev) => {
      const existing = new Set(prev.map((g) => g.exercise.id));
      const newGroups = exercises
        .filter((ex) => !existing.has(ex.id))
        .map((ex) => ({
          exercise: ex,
          sets: [
            {
              tempId: crypto.randomUUID(),
              exercise_id: ex.id,
              exercise_name: ex.name,
              set_number: 1,
              reps: "",
              weight: "",
            },
          ],
        }));
      return [...prev, ...newGroups];
    });
  };

  const addSetToGroup = (exerciseId: string) => {
    setExerciseGroups((prev) =>
      prev.map((g) => {
        if (g.exercise.id !== exerciseId) return g;
        return {
          ...g,
          sets: [
            ...g.sets,
            {
              tempId: crypto.randomUUID(),
              exercise_id: exerciseId,
              exercise_name: g.exercise.name,
              set_number: g.sets.length + 1,
              reps: "",
              weight: "",
            },
          ],
        };
      })
    );
  };

  const removeSet = (exerciseId: string, tempId: string) => {
    setExerciseGroups((prev) =>
      prev
        .map((g) => {
          if (g.exercise.id !== exerciseId) return g;
          const filtered = g.sets.filter((s) => s.tempId !== tempId);
          return {
            ...g,
            sets: filtered.map((s, i) => ({ ...s, set_number: i + 1 })),
          };
        })
        .filter((g) => g.sets.length > 0)
    );
  };

  const removeExerciseGroup = (exerciseId: string) => {
    setExerciseGroups((prev) =>
      prev.filter((g) => g.exercise.id !== exerciseId)
    );
  };

  const updateSet = (
    exerciseId: string,
    tempId: string,
    field: "reps" | "weight",
    value: string
  ) => {
    setExerciseGroups((prev) =>
      prev.map((g) => {
        if (g.exercise.id !== exerciseId) return g;
        return {
          ...g,
          sets: g.sets.map((s) =>
            s.tempId === tempId ? { ...s, [field]: value } : s
          ),
        };
      })
    );
  };

  const allSets = exerciseGroups.flatMap((g) => g.sets);

  const handleSave = async () => {
    if (!title.trim()) {
      setError("운동 제목을 입력해주세요.");
      return;
    }
    if (allSets.length === 0) {
      setError("운동을 추가해주세요.");
      return;
    }
    if (!user) return;

    setSaving(true);
    setError("");

    try {
      const workout = await addWorkout({
        user_id: user.uid,
        title: title.trim(),
        performed_at: performedAt,
        duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
        notes: notes.trim() || null,
      });

      const setsToInsert = allSets.map((s) => ({
        workout_id: workout.id,
        exercise_id: s.exercise_id,
        set_number: s.set_number,
        reps: s.reps ? parseInt(s.reps) : null,
        weight: s.weight ? parseFloat(s.weight) : null,
      }));

      await addWorkoutSets(setsToInsert);
      router.push(`/workouts/${workout.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다");
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-col min-h-[calc(100vh-3.5rem)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-background sticky top-14 z-30">
          <Link href="/workouts">
            <Button variant="ghost" size="icon" className="h-9 w-9" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold flex-1" data-testid="text-new-workout-title">
            새 운동 기록
          </h1>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="h-9"
            data-testid="button-save-workout"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            저장
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm" data-testid="text-error">
              {error}
            </div>
          )}

          <Card className="p-4 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-xs font-medium text-muted-foreground">
                운동 제목 *
              </Label>
              <Input
                id="title"
                placeholder="예: 상체 운동, 하체 데이"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-10"
                data-testid="input-title"
              />
            </div>

            <button
              className="flex items-center gap-1 text-xs text-muted-foreground"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              상세 정보
            </button>

            {showDetails && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="date" className="text-xs font-medium text-muted-foreground">
                      날짜
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={performedAt}
                      onChange={(e) => setPerformedAt(e.target.value)}
                      className="h-9 text-sm"
                      data-testid="input-date"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="duration" className="text-xs font-medium text-muted-foreground">
                      시간 (분)
                    </Label>
                    <Input
                      id="duration"
                      type="number"
                      placeholder="예: 60"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                      className="h-9 text-sm"
                      data-testid="input-duration"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs font-medium text-muted-foreground">
                    메모
                  </Label>
                  <Input
                    id="notes"
                    placeholder="오늘의 운동 메모..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-9 text-sm"
                    data-testid="input-notes"
                  />
                </div>
              </div>
            )}
          </Card>

          {exerciseGroups.length === 0 ? (
            <Card className="p-8 text-center space-y-3">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-muted mx-auto">
                <Dumbbell className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">운동을 추가해주세요</p>
                <p className="text-xs text-muted-foreground mt-1">
                  아래 버튼을 눌러 운동을 선택하세요
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {exerciseGroups.map((group, gIdx) => (
                <Card key={group.exercise.id} className="overflow-hidden" data-testid={`card-exercise-group-${gIdx}`}>
                  <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b">
                    <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{group.exercise.name}</p>
                      {group.exercise.muscle_group && (
                        <Badge variant="outline" className="mt-0.5 text-[10px] h-5">
                          {MUSCLE_GROUP_LABELS[group.exercise.muscle_group as MuscleGroup] || group.exercise.muscle_group}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => removeExerciseGroup(group.exercise.id)}
                      data-testid={`button-remove-exercise-${gIdx}`}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>

                  <div className="px-4 py-2">
                    <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider pb-1">
                      <span>세트</span>
                      <span>횟수</span>
                      <span>무게(kg)</span>
                      <span></span>
                    </div>

                    {group.sets.map((s, sIdx) => (
                      <div
                        key={s.tempId}
                        className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 items-center py-1.5"
                        data-testid={`row-set-${gIdx}-${sIdx}`}
                      >
                        <span className="text-xs font-mono text-muted-foreground text-center">
                          {s.set_number}
                        </span>
                        <Input
                          type="number"
                          placeholder="-"
                          value={s.reps}
                          onChange={(e) =>
                            updateSet(group.exercise.id, s.tempId, "reps", e.target.value)
                          }
                          className="h-9 text-sm text-center"
                          data-testid={`input-reps-${gIdx}-${sIdx}`}
                        />
                        <Input
                          type="number"
                          placeholder="-"
                          step="0.5"
                          value={s.weight}
                          onChange={(e) =>
                            updateSet(group.exercise.id, s.tempId, "weight", e.target.value)
                          }
                          className="h-9 text-sm text-center"
                          data-testid={`input-weight-${gIdx}-${sIdx}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeSet(group.exercise.id, s.tempId)}
                          data-testid={`button-remove-set-${gIdx}-${sIdx}`}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-1 h-8 text-xs text-muted-foreground"
                      onClick={() => addSetToGroup(group.exercise.id)}
                      data-testid={`button-add-set-${gIdx}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      세트 추가
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            className="w-full h-12 gap-2 border-dashed"
            onClick={() => setSelectorOpen(true)}
            data-testid="button-add-exercise"
          >
            <Plus className="h-5 w-5" />
            운동 추가
          </Button>
        </div>
      </div>

      <ExerciseSelector
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelect={handleExercisesSelected}
        initialSelected={exerciseGroups.map((g) => g.exercise)}
      />
    </>
  );
}
