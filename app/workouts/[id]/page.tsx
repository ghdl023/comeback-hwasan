"use client";

import { useAuth } from "@/components/auth-provider";
import {
  getWorkout,
  getWorkoutSets,
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

export default function WorkoutDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  const [bodyWeight, setBodyWeight] = useState("");
  const [skeletalMuscle, setSkeletalMuscle] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [bodySaving, setBodySaving] = useState(false);

  useEffect(() => {
    if (!user || !id) return;

    const fetchData = async () => {
      try {
        const [w, s, e] = await Promise.all([
          getWorkout(id, user.uid),
          getWorkoutSets(id).catch(() => [] as WorkoutSet[]),
          getExercises(user.uid).catch(() => [] as Exercise[]),
        ]);
        setWorkout(w);
        setSets(s);
        setExercises(e);

        if (w) {
          const dateStr = w.performed_at.split("T")[0];
          const body = await getBodyRecord(user.uid, dateStr).catch(() => null);
          if (body) {
            setBodyWeight(body.weight?.toString() || "");
            setSkeletalMuscle(body.skeletal_muscle?.toString() || "");
            setBodyFat(body.body_fat?.toString() || "");
          }
        }
      } catch (err) {
        console.error("Workout detail fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, id]);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyStateRef = useRef({ bodyWeight: "", skeletalMuscle: "", bodyFat: "" });

  useEffect(() => {
    bodyStateRef.current = { bodyWeight, skeletalMuscle, bodyFat };
  }, [bodyWeight, skeletalMuscle, bodyFat]);

  const debouncedSaveBody = useCallback(() => {
    if (!user || !workout) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const { bodyWeight: w, skeletalMuscle: sm, bodyFat: bf } = bodyStateRef.current;
      setBodySaving(true);
      try {
        const dateStr = workout.performed_at.split("T")[0];
        await saveBodyRecord({
          user_id: user.uid,
          date: dateStr,
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
  }, [user, workout]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const handleGoToToday = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    router.push(`/workouts/new?date=${todayStr}`);
  };

  const workoutDate = workout ? new Date(workout.performed_at) : null;
  const todayStr = new Date().toISOString().split("T")[0];
  const isToday = workoutDate && workout
    ? workout.performed_at.split("T")[0] === todayStr
    : false;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 space-y-4">
        <p className="text-sm text-muted-foreground">운동 기록을 찾을 수 없습니다.</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
          홈으로 돌아가기
        </Button>
      </div>
    );
  }

  const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

  const groupedByExercise = sets.reduce(
    (acc, s) => {
      if (!acc[s.exercise_id]) acc[s.exercise_id] = [];
      acc[s.exercise_id].push(s);
      return acc;
    },
    {} as Record<string, WorkoutSet[]>
  );

  const totalSets = sets.length;
  const totalVolume = sets.reduce((sum, s) => {
    return sum + (s.weight ? Number(s.weight) : 0) * (s.reps ?? 0);
  }, 0);

  const formattedDate = workoutDate
    ? format(workoutDate, "yyyy.MM.dd", { locale: ko })
    : "";

  return (
    <div className="flex flex-col h-[100dvh]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-background shrink-0 safe-area-top">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => router.back()}
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
                onClick={() => router.push(`/workouts/new?date=${workout.performed_at.split("T")[0]}`)}
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
                  <h2 className="text-base font-bold" data-testid="text-section-title">자유 운동</h2>
                  {workout.duration_minutes && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {workout.duration_minutes}분
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
                    {totalVolume > 0 ? `${(totalVolume / 1000).toFixed(1)}t` : "0kg"}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {Object.entries(groupedByExercise).map(([exerciseId, exSets]) => {
                  const exercise = exerciseMap.get(exerciseId);
                  const exVolume = exSets.reduce(
                    (sum, s) => sum + (s.weight ? Number(s.weight) : 0) * (s.reps ?? 0),
                    0
                  );

                  return (
                    <Card key={exerciseId} className="overflow-hidden" data-testid={`card-exercise-${exerciseId}`}>
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
                              <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                                {MUSCLE_GROUP_LABELS[exercise.muscle_group as MuscleGroup] || exercise.muscle_group}
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {exSets.length}세트 · {exVolume > 0 ? `${exVolume.toLocaleString()}kg` : "-"}
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
                            <span className="text-sm">{s.weight ? Number(s.weight) : "-"}</span>
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
            <h2 className="text-base font-bold mb-3" data-testid="text-body-section">신체 정보</h2>
            <Card className="p-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-muted-foreground">체중 (kg)</label>
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
                  <label className="text-[10px] font-medium text-muted-foreground">골격근량 (kg)</label>
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
                  <label className="text-[10px] font-medium text-muted-foreground">체지방 (%)</label>
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
                <p className="text-[10px] text-muted-foreground text-center mt-2">저장 중...</p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
