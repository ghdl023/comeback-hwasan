"use client";

import { useAuth } from "@/components/auth-provider";
import { getWorkouts, getWorkoutSetsByUser, deleteWorkout } from "@/lib/firebase/firestore";
import type { Workout, WorkoutSet } from "@/lib/types";
import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Dumbbell,
  CalendarDays,
  Plus,
  Loader2,
  Clock,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function WorkoutsPage() {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [w, s] = await Promise.all([
        getWorkouts(user.uid).catch(() => [] as Workout[]),
        getWorkoutSetsByUser(user.uid).catch(() => [] as WorkoutSet[]),
      ]);
      setWorkouts(w);
      setSets(s);
    } catch (err) {
      console.error("Workouts fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("이 운동 기록을 삭제하시겠습니까?")) return;
    setDeleting(id);
    await deleteWorkout(id);
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
    setSets((prev) => prev.filter((s) => s.workout_id !== id));
    setDeleting(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg md:max-w-4xl px-4 py-5 md:py-8 space-y-4 md:space-y-6 pb-20 md:pb-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold" data-testid="text-workouts-title">
            운동기록
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-0.5">
            총 {workouts.length}회 운동
          </p>
        </div>
        <Link href="/workouts/new">
          <Button size="sm" className="h-9 gap-1.5" data-testid="button-new-workout">
            <Plus className="h-4 w-4" />
            새 운동
          </Button>
        </Link>
      </div>

      {workouts.length === 0 ? (
        <Card className="p-10 md:p-12 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-muted mx-auto">
            <Dumbbell className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm">아직 운동 기록이 없습니다</p>
            <p className="text-xs text-muted-foreground mt-1">
              첫 운동을 기록해보세요!
            </p>
          </div>
          <Link href="/workouts/new">
            <Button size="sm" data-testid="button-first-workout">
              <Plus className="h-4 w-4" />
              첫 운동 기록하기
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-2">
          {workouts.map((workout) => {
            const workoutSets = sets.filter(
              (s) => s.workout_id === workout.id
            );
            const uniqueExercises = new Set(
              workoutSets.map((s) => s.exercise_id)
            );
            const volume = workoutSets.reduce((sum, s) => {
              return sum + (s.weight ? Number(s.weight) : 0) * (s.reps ?? 0);
            }, 0);

            return (
              <Link
                key={workout.id}
                href={`/workouts/${workout.id}`}
                data-testid={`link-workout-${workout.id}`}
              >
                <Card className="p-3.5 md:p-4 hover-elevate cursor-pointer transition-all">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-lg bg-primary/10 shrink-0">
                        <Dumbbell className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{workout.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {format(new Date(workout.performed_at), "M월 d일 (EEE)", { locale: ko })}
                          </span>
                          {workout.duration_minutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {workout.duration_minutes}분
                            </span>
                          )}
                          <span>
                            {uniqueExercises.size}종목 · {workoutSets.length}세트
                          </span>
                          {volume > 0 && (
                            <span>{(volume / 1000).toFixed(1)}t</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => handleDelete(workout.id, e)}
                        disabled={deleting === workout.id}
                        data-testid={`button-delete-workout-${workout.id}`}
                      >
                        {deleting === workout.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
