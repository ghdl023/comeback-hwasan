"use client";

import { useAuth } from "@/components/auth-provider";
import {
  getWorkouts,
  getWorkoutSetsByUser,
  getExercises,
  getBodyRecord,
  saveBodyRecord,
} from "@/lib/firebase/firestore";
import type { Workout, WorkoutSet, Exercise, MuscleGroup } from "@/lib/types";
import { MUSCLE_GROUP_LABELS } from "@/lib/types";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  CalendarCheck,
  Clock,
  Loader2,
  Dumbbell,
  Plus,
  Weight,
  Repeat,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function WorkoutDateDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const dateParam = params.date as string;

  const [dayWorkouts, setDayWorkouts] = useState<Workout[]>([]);
  const [allSets, setAllSets] = useState<WorkoutSet[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  const [bodyWeight, setBodyWeight] = useState("");
  const [skeletalMuscle, setSkeletalMuscle] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [bodySaving, setBodySaving] = useState(false);

  const targetDate = new Date(dateParam + "T00:00:00");

  useEffect(() => {
    if (!user || !dateParam) return;

    const fetchData = async () => {
      try {
        const [workouts, sets, exs] = await Promise.all([
          getWorkouts(user.uid),
          getWorkoutSetsByUser(user.uid),
          getExercises(user.uid).catch(() => [] as Exercise[]),
        ]);

        const filtered = workouts.filter((w) => {
          const d = new Date(w.performed_at);
          return isSameDay(d, targetDate);
        });

        setDayWorkouts(filtered);
        setAllSets(sets);
        setExercises(exs);

        const body = await getBodyRecord(user.uid, dateParam).catch(() => null);
        if (body) {
          setBodyWeight(body.weight?.toString() || "");
          setSkeletalMuscle(body.skeletal_muscle?.toString() || "");
          setBodyFat(body.body_fat?.toString() || "");
        }
      } catch (err) {
        console.error("Workout date detail fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, dateParam]);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyStateRef = useRef({ bodyWeight: "", skeletalMuscle: "", bodyFat: "" });

  useEffect(() => {
    bodyStateRef.current = { bodyWeight, skeletalMuscle, bodyFat };
  }, [bodyWeight, skeletalMuscle, bodyFat]);

  const debouncedSaveBody = useCallback(() => {
    if (!user || !dateParam) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const { bodyWeight: w, skeletalMuscle: sm, bodyFat: bf } = bodyStateRef.current;
      setBodySaving(true);
      try {
        await saveBodyRecord({
          user_id: user.uid,
          date: dateParam,
          weight: w ? parseFloat(w) : null,
          skeletal_muscle: sm ? parseFloat(sm) : null,
          body_fat: bf ? parseFloat(bf) : null,
        });
      } catch (err) {
        console.error("Body record save error:", err);
      } finally {
        setBodySaving(false);
      }
    }, 800);
  }, [user, dateParam]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const handleGoToToday = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    if (todayStr !== dateParam) {
      router.push(`/workouts/date/${todayStr}`);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const isToday = dateParam === todayStr;

  const formattedDate = format(targetDate, "yyyy.MM.dd (EEE)", { locale: ko });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

  const workoutIds = new Set(dayWorkouts.map((w) => w.id));
  const daySets = allSets.filter((s) => workoutIds.has(s.workout_id));

  const groupedByExercise = daySets.reduce(
    (acc, s) => {
      if (!acc[s.exercise_id]) acc[s.exercise_id] = [];
      acc[s.exercise_id].push(s);
      return acc;
    },
    {} as Record<string, WorkoutSet[]>
  );

  const totalSets = daySets.length;
  const totalVolume = daySets.reduce((sum, s) => {
    return sum + (s.weight ? Number(s.weight) : 0) * (s.reps ?? 0);
  }, 0);
  const totalDuration = dayWorkouts.reduce(
    (sum, w) => sum + (w.duration_minutes || 0),
    0
  );

  return (
    <div className="flex flex-col h-[100dvh]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-background shrink-0 safe-area-top">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => router.push("/dashboard")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <span className="text-sm font-semibold" data-testid="text-detail-date">
          {formattedDate}
        </span>

        <div className="flex items-center gap-1">
          {!isToday && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleGoToToday}
              data-testid="button-go-today"
              title="오늘"
            >
              <CalendarCheck className="h-4.5 w-4.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            data-testid="button-routine"
            title="루틴 (준비 중)"
            onClick={() => alert("루틴 기능은 준비 중입니다.")}
          >
            <Repeat className="h-4.5 w-4.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="px-4 py-4 space-y-4">
          {totalSets === 0 ? (
            <Card className="p-10 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mx-auto">
                <Dumbbell className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-base font-semibold">운동을 추가해주세요</p>
                <p className="text-xs text-muted-foreground mt-1">
                  아래 버튼을 눌러 운동을 기록하세요
                </p>
              </div>
              <Button
                className="gap-2"
                onClick={() => router.push(`/workouts/new?date=${dateParam}`)}
                data-testid="button-add-workout-empty"
              >
                <Plus className="h-4 w-4" />
                운동 추가
              </Button>
            </Card>
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-bold" data-testid="text-section-title">
                    운동 기록
                  </h2>
                  {totalDuration > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {totalDuration}분
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Dumbbell className="h-3 w-3" />
                    {totalSets}세트
                  </span>
                  <span className="flex items-center gap-1">
                    <Weight className="h-3 w-3" />
                    {totalVolume > 0
                      ? totalVolume >= 1000
                        ? `${(totalVolume / 1000).toFixed(1)}t`
                        : `${totalVolume.toLocaleString()}kg`
                      : "0kg"}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 mb-3 h-8 text-xs"
                  onClick={() => router.push(`/workouts/new?date=${dateParam}`)}
                  data-testid="button-add-more-workout"
                >
                  <Plus className="h-3.5 w-3.5" />
                  운동 추가
                </Button>
              </div>

              <div className="space-y-3">
                {Object.entries(groupedByExercise).map(([exerciseId, exSets]) => {
                  const exercise = exerciseMap.get(exerciseId);
                  const exVolume = exSets.reduce(
                    (sum, s) =>
                      sum + (s.weight ? Number(s.weight) : 0) * (s.reps ?? 0),
                    0
                  );

                  return (
                    <Card
                      key={exerciseId}
                      className="overflow-hidden"
                      data-testid={`card-exercise-${exerciseId}`}
                    >
                      <div className="flex items-center gap-3 px-3.5 py-2.5 bg-muted/30 border-b">
                        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 shrink-0">
                          <Dumbbell className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {exercise?.name || "알 수 없는 운동"}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {exercise?.muscle_group && (
                              <Badge
                                variant="outline"
                                className="text-[9px] h-4 px-1.5"
                              >
                                {MUSCLE_GROUP_LABELS[
                                  exercise.muscle_group as MuscleGroup
                                ] || exercise.muscle_group}
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {exSets.length}세트 ·{" "}
                              {exVolume > 0
                                ? `${exVolume.toLocaleString()}kg`
                                : "-"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="px-3.5 py-1.5">
                        <div className="grid grid-cols-3 gap-0 text-[10px] font-medium text-muted-foreground uppercase tracking-wider pb-1">
                          <span>세트</span>
                          <span>횟수</span>
                          <span>무게 (kg)</span>
                        </div>
                        {exSets.map((s) => (
                          <div
                            key={s.id}
                            className="grid grid-cols-3 gap-0 text-sm py-1 border-t border-muted/40"
                            data-testid={`row-set-${s.id}`}
                          >
                            <span className="font-mono text-xs text-muted-foreground">
                              {s.set_number}
                            </span>
                            <span className="text-sm">{s.reps ?? "-"}</span>
                            <span className="text-sm">
                              {s.weight ? Number(s.weight) : "-"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}

          <div className="pt-2">
            <h2 className="text-base font-bold mb-3" data-testid="text-body-section">
              신체 정보
            </h2>
            <Card className="p-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-muted-foreground">
                    체중 (kg)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="-"
                    value={bodyWeight}
                    onChange={(e) => setBodyWeight(e.target.value)}
                    onBlur={debouncedSaveBody}
                    className="h-9 text-sm text-center"
                    data-testid="input-body-weight"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-muted-foreground">
                    골격근량 (kg)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="-"
                    value={skeletalMuscle}
                    onChange={(e) => setSkeletalMuscle(e.target.value)}
                    onBlur={debouncedSaveBody}
                    className="h-9 text-sm text-center"
                    data-testid="input-skeletal-muscle"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-muted-foreground">
                    체지방 (%)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="-"
                    value={bodyFat}
                    onChange={(e) => setBodyFat(e.target.value)}
                    onBlur={debouncedSaveBody}
                    className="h-9 text-sm text-center"
                    data-testid="input-body-fat"
                  />
                </div>
              </div>
              {bodySaving && (
                <p className="text-[10px] text-muted-foreground text-center mt-2">
                  저장 중...
                </p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
