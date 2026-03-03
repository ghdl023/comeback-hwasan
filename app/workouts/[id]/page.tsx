"use client";

import { useAuth } from "@/components/auth-provider";
import { getWorkout, getWorkoutSets, getExercises, deleteWorkout } from "@/lib/firebase/firestore";
import type { Workout, WorkoutSet, Exercise, MuscleGroup } from "@/lib/types";
import { MUSCLE_GROUP_LABELS } from "@/lib/types";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Loader2,
  Trash2,
  Dumbbell,
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
  const [deleting, setDeleting] = useState(false);

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
      } catch (err) {
        console.error("Workout detail fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, id]);

  const handleDelete = async () => {
    if (!confirm("이 운동 기록을 삭제하시겠습니까?")) return;
    setDeleting(true);
    await deleteWorkout(id);
    router.push("/workouts");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 text-center space-y-4">
        <p className="text-muted-foreground text-sm">운동 기록을 찾을 수 없습니다.</p>
        <Link href="/workouts">
          <Button variant="outline" size="sm">운동기록으로 돌아가기</Button>
        </Link>
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

  const totalVolume = sets.reduce((sum, s) => {
    return sum + (s.weight ? Number(s.weight) : 0) * (s.reps ?? 0);
  }, 0);

  return (
    <div className="mx-auto max-w-lg md:max-w-3xl px-4 py-4 md:py-8 space-y-4 md:space-y-6 pb-20 md:pb-8">
      <div className="flex items-center gap-2">
        <Link href="/workouts">
          <Button variant="ghost" size="icon" className="h-9 w-9" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg md:text-2xl font-bold truncate" data-testid="text-workout-title">
            {workout.title}
          </h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {format(new Date(workout.performed_at), "yyyy년 M월 d일 (EEE)", { locale: ko })}
            </span>
            {workout.duration_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {workout.duration_minutes}분
              </span>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
          className="shrink-0 h-8"
          data-testid="button-delete-workout"
        >
          {deleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">삭제</span>
        </Button>
      </div>

      {workout.notes && (
        <Card className="p-3 md:p-4">
          <p className="text-sm text-muted-foreground">{workout.notes}</p>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <Card className="p-3 md:p-4 text-center">
          <p className="text-lg md:text-2xl font-bold" data-testid="text-exercise-count">
            {Object.keys(groupedByExercise).length}
          </p>
          <p className="text-[10px] md:text-sm text-muted-foreground">종목</p>
        </Card>
        <Card className="p-3 md:p-4 text-center">
          <p className="text-lg md:text-2xl font-bold" data-testid="text-set-count">
            {sets.length}
          </p>
          <p className="text-[10px] md:text-sm text-muted-foreground">세트</p>
        </Card>
        <Card className="p-3 md:p-4 text-center">
          <p className="text-lg md:text-2xl font-bold" data-testid="text-volume">
            {totalVolume > 0 ? `${(totalVolume / 1000).toFixed(1)}t` : "-"}
          </p>
          <p className="text-[10px] md:text-sm text-muted-foreground">볼륨</p>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="text-base md:text-lg font-semibold">운동 상세</h2>

        {Object.entries(groupedByExercise).length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              기록된 세트가 없습니다.
            </p>
          </Card>
        ) : (
          Object.entries(groupedByExercise).map(([exerciseId, exSets]) => {
            const exercise = exerciseMap.get(exerciseId);
            return (
              <Card key={exerciseId} className="overflow-hidden">
                <div className="flex items-center gap-3 px-3.5 md:px-4 py-3 bg-muted/30 border-b">
                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 shrink-0">
                    <Dumbbell className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {exercise?.name || "알 수 없는 운동"}
                    </p>
                    {exercise?.muscle_group && (
                      <Badge variant="outline" className="mt-0.5 text-[10px] h-5">
                        {MUSCLE_GROUP_LABELS[exercise.muscle_group as MuscleGroup] || exercise.muscle_group}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="px-3.5 md:px-4 py-2">
                  <div className="grid grid-cols-3 gap-0 text-[10px] font-medium text-muted-foreground uppercase tracking-wider pb-1.5">
                    <span>세트</span>
                    <span>횟수</span>
                    <span>무게 (kg)</span>
                  </div>
                  {exSets.map((s) => (
                    <div
                      key={s.id}
                      className="grid grid-cols-3 gap-0 text-sm py-1.5 border-t border-muted/50"
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
          })
        )}
      </div>
    </div>
  );
}
