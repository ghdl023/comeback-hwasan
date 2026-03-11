"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { WorkoutSet, Exercise, MuscleGroup } from "@/lib/types";
import { MUSCLE_GROUP_LABELS } from "@/lib/types";
import {
  updateWorkoutSet,
  deleteWorkoutSet,
  addSingleWorkoutSet,
} from "@/lib/firebase/firestore";
import { useRestTimer, type TimerState } from "@/components/rest-timer-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  Dumbbell,
  Loader2,
  X,
  Copy,
  Square,
  Play,
  Timer,
  Circle,
  Pause,
} from "lucide-react";

interface DayExerciseInfo {
  exerciseId: string;
  name: string;
}

interface SetEditorProps {
  exerciseId: string;
  exercise: Exercise | undefined;
  sets: WorkoutSet[];
  date: string;
  workoutId: string;
  onClose: () => void;
  onSetsChanged: (updatedSets: WorkoutSet[]) => void;
  dayExercises?: DayExerciseInfo[];
  onSwitchExercise?: (exerciseId: string) => void;
}

interface LocalSet {
  id: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  rest_seconds: number | null;
  completed: boolean;
  workout_id: string;
  exercise_id: string;
  isNew?: boolean;
}

function formatRestDisplay(v: number | null): string {
  if (v === null || v === 0) return "";
  const m = Math.floor(v / 100);
  const s = v % 100;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatRestLabel(v: number | null): string {
  if (v === null) return "-";
  const m = Math.floor(v / 100);
  const s = v % 100;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function mmssToSeconds(v: number | null): number {
  if (v === null || v === 0) return 0;
  const m = Math.floor(v / 100);
  const s = v % 100;
  return m * 60 + s;
}

function secondsToMMSS(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function SetEditor({
  exerciseId,
  exercise,
  sets,
  date,
  workoutId,
  onClose,
  onSetsChanged,
  dayExercises,
  onSwitchExercise,
}: SetEditorProps) {
  const [localSets, setLocalSets] = useState<LocalSet[]>([]);
  const [expandedSet, setExpandedSet] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [exerciseListOpen, setExerciseListOpen] = useState(false);
  const saveTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const {
    timerState,
    restingSetIdx,
    startRestTimer: globalStartRestTimer,
    stopTimer: globalStopTimer,
    clearTimer: globalClearTimer,
    setTimerTarget,
    setOnCompleteSet,
    timerTarget,
    setRestingSetIdx,
  } = useRestTimer();

  const isTimerForThisExercise = timerTarget?.exerciseId === exerciseId && timerTarget?.workoutId === workoutId;
  const effectiveTimerState: TimerState = isTimerForThisExercise ? timerState : { mode: "idle" };
  const effectiveRestingSetIdx = isTimerForThisExercise ? restingSetIdx : null;

  const setsKey = useMemo(() => sets.map((s) => s.id).sort().join(","), [sets]);
  useEffect(() => {
    const mapped = sets
      .filter((s) => s.exercise_id === exerciseId)
      .sort((a, b) => a.set_number - b.set_number)
      .map((s) => ({
        id: s.id,
        set_number: s.set_number,
        weight: s.weight,
        reps: s.reps,
        rest_seconds: s.rest_seconds ?? null,
        completed: s.completed ?? false,
        workout_id: s.workout_id,
        exercise_id: s.exercise_id,
      }));
    setLocalSets(mapped);
  }, [setsKey, exerciseId]);

  const localSetsRef = useRef(localSets);
  localSetsRef.current = localSets;

  const syncToParent = useCallback((updatedLocal: LocalSet[]) => {
    const synced = updatedLocal.map((s) => ({
      id: s.id,
      workout_id: s.workout_id,
      exercise_id: s.exercise_id,
      set_number: s.set_number,
      weight: s.weight,
      reps: s.reps,
      rest_seconds: s.rest_seconds,
      completed: s.completed,
      created_at: sets.find((orig) => orig.id === s.id)?.created_at || new Date().toISOString(),
    }));
    onSetsChanged(synced);
  }, [sets, onSetsChanged]);

  useEffect(() => {
    if (!isTimerForThisExercise) return;
    const handler = (idx: number) => {
      setLocalSets((prev) => {
        const updated = prev.map((p, i) => (i === idx ? { ...p, completed: true } : p));
        if (updated[idx] && !updated[idx].isNew) {
          updateWorkoutSet(updated[idx].id, { completed: true }).catch(console.error);
        }
        syncToParent(updated);
        return updated;
      });
    };
    setOnCompleteSet(handler);
    return () => {
      setOnCompleteSet(undefined);
    };
  }, [isTimerForThisExercise, setOnCompleteSet, syncToParent]);

  useEffect(() => {
    return () => {
      Object.values(saveTimers.current).forEach(clearTimeout);
    };
  }, []);

  const startRestTimer = useCallback((setIdx: number, restMmss: number | null, completeOldIdx?: number) => {
    setTimerTarget({
      exerciseId,
      exerciseName: exercise?.name ?? "",
      workoutId,
      date,
    });
    if (completeOldIdx !== undefined) {
      setRestingSetIdx(null);
      setLocalSets((prev) => {
        const updated = prev.map((p, i) => (i === completeOldIdx ? { ...p, completed: true } : p));
        if (updated[completeOldIdx] && !updated[completeOldIdx].isNew) {
          updateWorkoutSet(updated[completeOldIdx].id, { completed: true }).catch(console.error);
        }
        syncToParent(updated);
        return updated;
      });
    }
    const docId = localSetsRef.current[setIdx]?.id || "";
    globalStartRestTimer(setIdx, restMmss, docId);
  }, [exerciseId, exercise?.name, workoutId, date, setTimerTarget, globalStartRestTimer, setRestingSetIdx, syncToParent]);

  const stopTimer = useCallback((currentSetIdx: number) => {
    globalStopTimer(currentSetIdx);
  }, [globalStopTimer]);

  const debouncedSave = useCallback((setData: LocalSet) => {
    if (setData.isNew) return;
    const key = setData.id;
    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(() => {
      updateWorkoutSet(setData.id, {
        weight: setData.weight,
        reps: setData.reps,
        rest_seconds: setData.rest_seconds,
        completed: setData.completed,
        set_number: setData.set_number,
      }).catch(console.error);
      delete saveTimers.current[key];
    }, 600);
  }, []);

  const [confirmResetIdx, setConfirmResetIdx] = useState<number | null>(null);

  const handleStatusClick = (idx: number) => {
    const s = localSets[idx];
    if (s.completed) {
      setConfirmResetIdx(idx);
    } else if (effectiveRestingSetIdx === idx) {
      stopTimer(idx);
    } else {
      const restVal = s.rest_seconds ?? localSets.find((ls) => ls.rest_seconds !== null && ls.rest_seconds > 0)?.rest_seconds ?? null;
      startRestTimer(idx, restVal, effectiveRestingSetIdx !== null ? effectiveRestingSetIdx : undefined);
    }
  };

  const handleConfirmReset = () => {
    if (confirmResetIdx === null) return;
    const idx = confirmResetIdx;
    setLocalSets((prev) => {
      const updated = prev.map((p, i) => (i === idx ? { ...p, completed: false } : p));
      if (!updated[idx].isNew) {
        updateWorkoutSet(updated[idx].id, { completed: false }).catch(console.error);
      }
      syncToParent(updated);
      return updated;
    });
    setConfirmResetIdx(null);
  };

  const getSetStatus = (idx: number): "pending" | "resting" | "done" => {
    if (effectiveRestingSetIdx === idx) return "resting";
    if (localSets[idx]?.completed) return "done";
    return "pending";
  };

  const handleFieldChange = (idx: number, field: "weight" | "reps" | "rest_seconds", value: number | null) => {
    setLocalSets((prev) => {
      const updated = prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p));
      debouncedSave(updated[idx]);
      syncToParent(updated);
      return updated;
    });
  };

  const handleFieldAdjust = (idx: number, field: "weight" | "reps" | "rest_seconds", delta: number) => {
    setLocalSets((prev) => {
      const updated = prev.map((p, i) => {
        if (i !== idx) return p;
        const current = p[field] ?? 0;
        const newVal = Math.max(0, current + delta);
        return { ...p, [field]: newVal };
      });
      debouncedSave(updated[idx]);
      syncToParent(updated);
      return updated;
    });
  };

  const handleDeleteSet = async (idx: number) => {
    const s = localSets[idx];
    if (deleteConfirm !== s.id) {
      setDeleteConfirm(s.id);
      return;
    }
    setDeleteConfirm(null);
    if (isTimerForThisExercise && timerState.mode === "running" && timerState.setDocId === s.id) {
      globalClearTimer();
    }
    if (isTimerForThisExercise && effectiveRestingSetIdx === idx) {
      globalClearTimer();
    }
    if (!s.isNew) {
      await deleteWorkoutSet(s.id).catch(console.error);
    }
    setLocalSets((prev) => {
      const filtered = prev.filter((_, i) => i !== idx);
      const renumbered = filtered.map((p, i) => ({ ...p, set_number: i + 1 }));
      syncToParent(renumbered);
      return renumbered;
    });
  };

  const handleAddSet = async () => {
    const newSetNumber = localSets.length + 1;
    const lastSet = localSets[localSets.length - 1];
    setSaving(true);
    try {
      const created = await addSingleWorkoutSet({
        workout_id: workoutId,
        exercise_id: exerciseId,
        set_number: newSetNumber,
        weight: lastSet?.weight ?? 10,
        reps: lastSet?.reps ?? 15,
        rest_seconds: lastSet?.rest_seconds ?? 130,
        completed: false,
      });
      const newLocal: LocalSet = {
        id: created.id,
        set_number: newSetNumber,
        weight: lastSet?.weight ?? 10,
        reps: lastSet?.reps ?? 15,
        rest_seconds: lastSet?.rest_seconds ?? 130,
        completed: false,
        workout_id: workoutId,
        exercise_id: exerciseId,
      };
      setLocalSets((prev) => {
        const updated = [...prev, newLocal];
        syncToParent(updated);
        return updated;
      });
    } catch (err) {
      console.error("Add set error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    Object.values(saveTimers.current).forEach(clearTimeout);
    saveTimers.current = {};
    const updatedSets = localSets.filter((s) => !s.isNew).map((s) => ({
      id: s.id,
      workout_id: s.workout_id,
      exercise_id: s.exercise_id,
      set_number: s.set_number,
      weight: s.weight,
      reps: s.reps,
      rest_seconds: s.rest_seconds,
      completed: s.completed,
      created_at: sets.find((orig) => orig.id === s.id)?.created_at || new Date().toISOString(),
    }));
    onSetsChanged(updatedSets);
    onClose();
  };

  const currentExerciseIndex = dayExercises?.findIndex((e) => e.exerciseId === exerciseId) ?? -1;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" data-testid="set-editor">
      <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0 safe-area-top pt-8">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleClose} data-testid="button-set-editor-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <p className="text-base font-bold leading-tight" data-testid="text-set-editor-date">{date}</p>
      </div>

      {dayExercises && dayExercises.length > 0 && (
        <div
          className="flex items-center justify-center gap-2 px-4 py-2.5 border-b shrink-0 cursor-pointer"
          onClick={() => setExerciseListOpen(true)}
          data-testid="button-exercise-dots"
        >
          {dayExercises.map((de) => (
            <div key={de.exerciseId} className="flex items-center justify-center">
              {de.exerciseId === exerciseId ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-muted-foreground/30" />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">{exercise?.name || "운동"}</h2>
          </div>
          {exercise?.muscle_group && (
            <Badge variant="outline" className="text-xs h-5 px-2 mt-1">
              {MUSCLE_GROUP_LABELS[exercise.muscle_group as MuscleGroup] || exercise.muscle_group}
            </Badge>
          )}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-3">
          <div className="space-y-2">
            {localSets.map((s, idx) => {
              const isExpanded = expandedSet === idx;
              const isDeleteReady = deleteConfirm === s.id;
              const status = getSetStatus(idx);
              const isDisabled = status === "done" || status === "resting";
              return (
                <div key={s.id || idx} className={`border rounded-lg overflow-hidden transition-colors ${isDisabled ? "bg-muted/40" : ""}`} data-testid={`set-row-${idx}`}>
                  <div className="flex items-center gap-2 px-3 py-3">
                    <button
                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        status === "done"
                          ? "bg-emerald-500 border-emerald-500"
                          : status === "resting"
                          ? "bg-amber-500 border-amber-500"
                          : "border-muted-foreground/30"
                      }`}
                      onClick={() => handleStatusClick(idx)}
                      data-testid={`button-complete-${idx}`}
                    >
                      {status === "done" && <Check className="h-3.5 w-3.5 text-white" />}
                      {status === "resting" && <Pause className="h-3.5 w-3.5 text-white" />}
                      {status === "pending" && <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />}
                    </button>

                    <span className="text-sm font-bold text-muted-foreground w-6 text-center shrink-0">{s.set_number}</span>

                    <div className="flex-1 flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground">{s.weight ?? "-"}</span>kg
                      </span>
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground">{s.reps ?? "-"}</span>회
                      </span>
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground">{formatRestLabel(s.rest_seconds)}</span>
                      </span>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 shrink-0 ${isDeleteReady ? "text-destructive bg-destructive/10" : "text-muted-foreground"}`}
                      onClick={() => handleDeleteSet(idx)}
                      data-testid={`button-delete-set-${idx}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground"
                      onClick={() => setExpandedSet(isExpanded ? null : idx)}
                      data-testid={`button-expand-set-${idx}`}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>

                  <div
                    className="overflow-hidden transition-all duration-200 ease-in-out"
                    style={{
                      maxHeight: isExpanded ? "350px" : "0px",
                      opacity: isExpanded ? 1 : 0,
                    }}
                  >
                    <div className="px-3 pb-3 pt-2 border-t bg-muted/20 space-y-3.5">
                      <SetFieldRow
                        label="무게 (kg)"
                        value={s.weight}
                        step={5}
                        onChange={(v) => handleFieldChange(idx, "weight", v)}
                        onAdjust={(d) => handleFieldAdjust(idx, "weight", d)}
                      />
                      <SetFieldRow
                        label="횟수"
                        value={s.reps}
                        step={1}
                        onChange={(v) => handleFieldChange(idx, "reps", v)}
                        onAdjust={(d) => handleFieldAdjust(idx, "reps", d)}
                      />
                      <RestFieldRow
                        value={s.rest_seconds}
                        onChange={(v) => handleFieldChange(idx, "rest_seconds", v)}
                        onAdjust={(d) => handleFieldAdjust(idx, "rest_seconds", d)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-4 py-3 border-t shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 text-sm flex-1" onClick={() => setBulkEditOpen(true)} data-testid="button-bulk-edit">
              일괄수정
            </Button>
            <Button variant="outline" size="sm" className="h-9 text-sm flex-1 gap-1" data-testid="button-load-sets" disabled>
              <Copy className="h-3.5 w-3.5" /> 세트 불러오기
            </Button>
            <Button size="sm" className="h-9 text-sm flex-1 gap-1" onClick={handleAddSet} disabled={saving} data-testid="button-add-set">
              <Plus className="h-3.5 w-3.5" /> 세트 추가
            </Button>
          </div>
        </div>

        <div className="shrink-0 safe-area-bottom" data-testid="rest-timer-area">
          {effectiveTimerState.mode === "idle" && (
            <div className="border-t px-4 py-3 bg-muted/10">
              <div className="flex items-center gap-3">
                <Timer className="h-5 w-5 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">휴식 타이머</span>
                <span className="text-sm text-muted-foreground/60 flex-1 text-center">세트를 클릭하여 시작</span>
              </div>
            </div>
          )}

          {effectiveTimerState.mode === "running" && (
            <div className="relative overflow-hidden border-t" data-testid="rest-timer-running">
              <div
                className="absolute inset-0 bg-primary/15 transition-[width] duration-1000 ease-linear"
                style={{ width: `${((effectiveTimerState.totalSec - effectiveTimerState.remainSec) / effectiveTimerState.totalSec) * 100}%` }}
              />
              <div className="relative flex items-center gap-3 px-4 py-3">
                <Timer className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm font-bold text-primary">휴식 타이머</span>
                <span className="text-lg font-mono font-bold flex-1 text-center">
                  {secondsToMMSS(effectiveTimerState.remainSec)}
                  <span className="text-sm text-muted-foreground font-normal"> / {secondsToMMSS(effectiveTimerState.totalSec)}</span>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10"
                  onClick={() => stopTimer(effectiveTimerState.setIdx)}
                  data-testid="button-timer-stop"
                >
                  <Square className="h-4 w-4 fill-current" />
                </Button>
              </div>
            </div>
          )}

          {effectiveTimerState.mode === "next" && (() => {
            const nextSet = localSets[effectiveTimerState.nextSetIdx];
            if (!nextSet) return (
              <div className="border-t px-4 py-3 flex items-center justify-center gap-2 bg-muted/30">
                <Check className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium">모든 세트 완료</span>
              </div>
            );
            return (
              <div className="border-t px-4 py-3 bg-muted/20" data-testid="rest-timer-next">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <span className="text-xs text-muted-foreground">다음 세트</span>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-base font-bold">세트 {nextSet.set_number}</span>
                      <span className="text-sm text-muted-foreground">
                        {nextSet.weight ?? "-"}kg · {nextSet.reps ?? "-"}회
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="h-9 px-4 text-sm gap-1.5"
                    onClick={() => {
                      const rv = nextSet.rest_seconds ?? localSets.find((ls) => ls.rest_seconds !== null && ls.rest_seconds > 0)?.rest_seconds ?? null;
                      startRestTimer(effectiveTimerState.mode === "next" ? effectiveTimerState.nextSetIdx : 0, rv);
                    }}
                    data-testid="button-timer-start-rest"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" /> 휴식 시작
                  </Button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {confirmResetIdx !== null && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center" onClick={() => setConfirmResetIdx(null)}>
          <div
            className="bg-background rounded-xl p-5 mx-6 max-w-sm w-full shadow-lg"
            onClick={(e) => e.stopPropagation()}
            data-testid="confirm-reset-dialog"
          >
            <p className="text-sm font-medium text-center mb-4">이미 완료된 세트입니다.<br />체크를 해제하시겠습니까?</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="flex-1 h-10 text-sm" onClick={() => setConfirmResetIdx(null)} data-testid="button-confirm-cancel">
                취소
              </Button>
              <Button className="flex-1 h-10 text-sm" onClick={handleConfirmReset} data-testid="button-confirm-ok">
                확인
              </Button>
            </div>
          </div>
        </div>
      )}

      {bulkEditOpen && (
        <BulkEditPopup
          sets={localSets}
          onApply={(updated) => {
            setLocalSets(updated);
            syncToParent(updated);
            setBulkEditOpen(false);
          }}
          onCancel={() => setBulkEditOpen(false)}
          onSave={async (updated) => {
            setSaving(true);
            try {
              for (const s of updated) {
                if (!s.isNew) {
                  await updateWorkoutSet(s.id, {
                    weight: s.weight,
                    reps: s.reps,
                    rest_seconds: s.rest_seconds,
                  });
                }
              }
              setLocalSets(updated);
              syncToParent(updated);
              setBulkEditOpen(false);
            } catch (err) {
              console.error("Bulk save error:", err);
            } finally {
              setSaving(false);
            }
          }}
        />
      )}

      {exerciseListOpen && dayExercises && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center" onClick={() => setExerciseListOpen(false)}>
          <div
            className="bg-background rounded-t-2xl w-full max-w-md shadow-lg safe-area-bottom"
            onClick={(e) => e.stopPropagation()}
            data-testid="exercise-list-popup"
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h3 className="text-sm font-bold">운동 목록</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExerciseListOpen(false)} data-testid="button-close-exercise-list">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="px-2 pb-4 max-h-[50vh] overflow-y-auto">
              {dayExercises.map((de, idx) => {
                const isCurrent = de.exerciseId === exerciseId;
                return (
                  <button
                    key={de.exerciseId}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 ${
                      isCurrent
                        ? "bg-primary/10 text-primary font-semibold"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => {
                      if (!isCurrent && onSwitchExercise) {
                        Object.values(saveTimers.current).forEach(clearTimeout);
                        saveTimers.current = {};
                        const updatedSets = localSets.filter((ls) => !ls.isNew).map((ls) => ({
                          id: ls.id,
                          workout_id: ls.workout_id,
                          exercise_id: ls.exercise_id,
                          set_number: ls.set_number,
                          weight: ls.weight,
                          reps: ls.reps,
                          rest_seconds: ls.rest_seconds,
                          completed: ls.completed,
                          created_at: sets.find((orig) => orig.id === ls.id)?.created_at || new Date().toISOString(),
                        }));
                        onSetsChanged(updatedSets);
                        onSwitchExercise(de.exerciseId);
                      }
                    }}
                    data-testid={`exercise-list-item-${idx}`}
                  >
                    {isCurrent ? (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                    )}
                    <span className="truncate">{de.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SetFieldRow({
  label,
  value,
  step,
  onChange,
  onAdjust,
}: {
  label: string;
  value: number | null;
  step: number;
  onChange: (v: number | null) => void;
  onAdjust: (delta: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground w-20 shrink-0">{label}</span>
      <div className="flex-1 flex items-center justify-end gap-2">
        <Input
          type="number"
          className="h-9 text-center text-sm w-20 shrink-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          value={value ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "" ? null : Number(v));
          }}
        />
        <Button size="sm" className="h-9 w-12 shrink-0 text-sm font-medium bg-blue-500/15 text-blue-600 hover:bg-blue-500/25 border-0 px-0" variant="outline" onClick={() => onAdjust(-step)}>
          -{step}
        </Button>
        <Button size="sm" className="h-9 w-12 shrink-0 text-sm font-medium bg-red-500/15 text-red-600 hover:bg-red-500/25 border-0 px-0" variant="outline" onClick={() => onAdjust(step)}>
          +{step}
        </Button>
      </div>
    </div>
  );
}

function RestFieldRow({
  value,
  onChange,
  onAdjust,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  onAdjust: (delta: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground w-20 shrink-0">휴식</span>
      <div className="flex-1 flex items-center justify-end gap-2">
        <Input
          type="text"
          inputMode="numeric"
          className="h-9 text-center text-sm w-20 shrink-0"
          placeholder="00:00"
          value={formatRestDisplay(value)}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "");
            if (raw === "") {
              onChange(null);
              return;
            }
            onChange(Number(raw));
          }}
        />
        <Button size="sm" className="h-9 w-12 shrink-0 text-sm font-medium bg-blue-500/15 text-blue-600 hover:bg-blue-500/25 border-0 px-0" variant="outline" onClick={() => onAdjust(-30)}>
          -30
        </Button>
        <Button size="sm" className="h-9 w-12 shrink-0 text-sm font-medium bg-red-500/15 text-red-600 hover:bg-red-500/25 border-0 px-0" variant="outline" onClick={() => onAdjust(30)}>
          +30
        </Button>
      </div>
    </div>
  );
}

function BulkEditPopup({
  sets,
  onApply,
  onCancel,
  onSave,
}: {
  sets: LocalSet[];
  onApply: (updated: LocalSet[]) => void;
  onCancel: () => void;
  onSave: (updated: LocalSet[]) => Promise<void>;
}) {
  const [localSets, setLocalSets] = useState<LocalSet[]>([...sets]);
  const [checked, setChecked] = useState<Set<number>>(new Set(sets.map((_, i) => i)));
  const [field, setField] = useState<"weight" | "reps" | "rest_seconds">("weight");
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleCheck = (idx: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const applyAction = (action: "set" | "decrease" | "increase") => {
    const raw = field === "rest_seconds" ? inputValue.replace(/\D/g, "") : inputValue;
    const val = Number(raw);
    if (isNaN(val)) return;
    setLocalSets((prev) =>
      prev.map((s, i) => {
        if (!checked.has(i)) return s;
        const current = s[field] ?? 0;
        let newVal: number;
        if (action === "set") newVal = val;
        else if (action === "increase") newVal = current + val;
        else newVal = Math.max(0, current - val);
        return { ...s, [field]: newVal };
      })
    );
  };

  const fieldLabel = field === "weight" ? "무게" : field === "reps" ? "횟수" : "휴식";
  const isRestField = field === "rest_seconds";

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center" onClick={onCancel}>
      <div
        className="w-full max-w-lg bg-background rounded-t-2xl flex flex-col max-h-[85dvh] safe-area-bottom"
        onClick={(e) => e.stopPropagation()}
        data-testid="bulk-edit-popup"
      >
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="text-base font-bold">일괄수정</h3>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {localSets.map((s, idx) => (
            <div key={s.id || idx} className="flex items-center gap-3 py-2 border-b border-muted/30" data-testid={`bulk-set-${idx}`}>
              <button
                className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  checked.has(idx) ? "bg-primary border-primary" : "border-muted-foreground/30"
                }`}
                onClick={() => toggleCheck(idx)}
              >
                {checked.has(idx) && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
              </button>
              <span className="text-sm font-bold text-muted-foreground w-6">{s.set_number}</span>
              <span className="text-sm flex-1">
                {s.weight ?? "-"}kg · {s.reps ?? "-"}회 · {formatRestLabel(s.rest_seconds)}
              </span>
            </div>
          ))}
        </div>

        <div className="px-4 py-3 border-t space-y-3">
          <div className="flex items-center gap-2">
            {(["weight", "reps", "rest_seconds"] as const).map((f) => {
              const l = f === "weight" ? "무게" : f === "reps" ? "횟수" : "휴식";
              return (
                <button
                  key={f}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                    field === f ? "bg-primary text-primary-foreground border-primary" : "border-border"
                  }`}
                  onClick={() => { setField(f); setInputValue(""); }}
                  data-testid={`radio-field-${f}`}
                >
                  {l}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground shrink-0">{fieldLabel}</span>
            <div className="flex-1 flex items-center justify-end gap-2">
              {isRestField ? (
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="00:00"
                  className="h-9 text-sm w-20 shrink-0 text-center"
                  value={inputValue ? formatRestDisplay(Number(inputValue.replace(/\D/g, ""))) : ""}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    setInputValue(raw);
                  }}
                  data-testid="input-bulk-value"
                />
              ) : (
                <Input
                  type="number"
                  placeholder="값"
                  className="h-9 text-sm w-20 shrink-0 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  data-testid="input-bulk-value"
                />
              )}
              <Button variant="outline" size="sm" className="h-9 text-sm px-3" onClick={() => applyAction("set")} data-testid="button-bulk-set">
                지정
              </Button>
              <Button size="sm" className="h-9 text-sm px-3 bg-blue-500/15 text-blue-600 hover:bg-blue-500/25 border-0" variant="outline" onClick={() => applyAction("decrease")} data-testid="button-bulk-decrease">
                감소
              </Button>
              <Button size="sm" className="h-9 text-sm px-3 bg-red-500/15 text-red-600 hover:bg-red-500/25 border-0" variant="outline" onClick={() => applyAction("increase")} data-testid="button-bulk-increase">
                증가
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button variant="outline" className="flex-1 h-10 text-sm" onClick={onCancel} data-testid="button-bulk-cancel">
              취소
            </Button>
            <Button
              className="flex-1 h-10 text-sm"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                await onSave(localSets);
                setSaving(false);
              }}
              data-testid="button-bulk-save"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "저장"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
