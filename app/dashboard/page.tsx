"use client";

import { useAuth } from "@/components/auth-provider";
import { getWorkouts, getWorkoutSetsByUser, getExercises } from "@/lib/firebase/firestore";
import type { Workout, WorkoutSet, Exercise } from "@/lib/types";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Dumbbell,
  CalendarDays,
  TrendingUp,
  Plus,
  Loader2,
  Clock,
  ChevronRight,
  Flame,
} from "lucide-react";
import { format, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { ko } from "date-fns/locale";

export default function DashboardPage() {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const [w, s, e] = await Promise.all([
          getWorkouts(user.uid, 10).catch(() => [] as Workout[]),
          getWorkoutSetsByUser(user.uid).catch(() => [] as WorkoutSet[]),
          getExercises(user.uid).catch(() => [] as Exercise[]),
        ]);
        setWorkouts(w);
        setSets(s);
        setExercises(e);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const thisWeekWorkouts = workouts.filter((w) => {
    const d = new Date(w.performed_at);
    return isWithinInterval(d, { start: weekStart, end: weekEnd });
  });

  const totalSets = sets.length;
  const totalVolume = sets.reduce((sum, s) => {
    const w = s.weight ? Number(s.weight) : 0;
    const r = s.reps ?? 0;
    return sum + w * r;
  }, 0);

  const stats = [
    {
      label: "총 운동",
      value: workouts.length,
      icon: Dumbbell,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "이번 주",
      value: thisWeekWorkouts.length,
      icon: Flame,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      label: "총 세트",
      value: totalSets,
      icon: TrendingUp,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "총 볼륨",
      value: `${(totalVolume / 1000).toFixed(1)}t`,
      icon: TrendingUp,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <div className="mx-auto max-w-lg md:max-w-6xl px-4 py-5 md:py-8 space-y-5 md:space-y-8 pb-20 md:pb-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold" data-testid="text-dashboard-title">
            대시보드
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {user?.displayName ? `${user.displayName}님, 안녕하세요!` : "환영합니다!"}
          </p>
        </div>
        <Link href="/workouts/new">
          <Button size="sm" className="h-9 gap-1.5" data-testid="button-new-workout">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">새 운동</span>
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-3.5 md:p-5 space-y-2">
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <span className="text-xs md:text-sm text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-xl md:text-2xl font-bold" data-testid={`text-stat-${stat.label}`}>
              {stat.value}
            </p>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base md:text-lg font-semibold">최근 운동</h2>
          <Link href="/workouts">
            <Button variant="ghost" size="sm" className="h-8 text-xs" data-testid="link-all-workouts">
              전체보기
              <ChevronRight className="h-3.5 w-3.5" />
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
            {workouts.slice(0, 5).map((workout) => {
              const workoutSets = sets.filter(
                (s) => s.workout_id === workout.id
              );
              const uniqueExercises = new Set(
                workoutSets.map((s) => s.exercise_id)
              );
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
                          <p className="text-sm font-medium truncate">
                            {workout.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {format(new Date(workout.performed_at), "M월 d일", { locale: ko })}
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
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
