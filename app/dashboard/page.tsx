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
} from "lucide-react";
import { format, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";

export default function DashboardPage() {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [w, s, e] = await Promise.all([
        getWorkouts(user.uid, 10),
        getWorkoutSetsByUser(user.uid),
        getExercises(user.uid),
      ]);
      setWorkouts(w);
      setSets(s);
      setExercises(e);
      setLoading(false);
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
      label: "Total Workouts",
      value: workouts.length,
      icon: Dumbbell,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "This Week",
      value: thisWeekWorkouts.length,
      icon: CalendarDays,
      color: "text-chart-2",
      bg: "bg-chart-2/10",
    },
    {
      label: "Total Sets",
      value: totalSets,
      icon: TrendingUp,
      color: "text-chart-3",
      bg: "bg-chart-3/10",
    },
    {
      label: "Total Volume",
      value: `${(totalVolume / 1000).toFixed(1)}t`,
      icon: TrendingUp,
      color: "text-chart-4",
      bg: "bg-chart-4/10",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back{user?.displayName ? `, ${user.displayName}` : ""}!
          </p>
        </div>
        <Link href="/workouts/new">
          <Button data-testid="button-new-workout">
            <Plus className="h-4 w-4" />
            New Workout
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold" data-testid={`text-stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
              {stat.value}
            </p>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Recent Workouts</h2>
          <Link href="/workouts">
            <Button variant="ghost" size="sm" data-testid="link-all-workouts">
              View All
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {workouts.length === 0 ? (
          <Card className="p-12 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mx-auto">
              <Dumbbell className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No workouts yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start logging your first workout to see your progress here.
              </p>
            </div>
            <Link href="/workouts/new">
              <Button data-testid="button-first-workout">
                <Plus className="h-4 w-4" />
                Log Your First Workout
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
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
                  <Card className="p-4 hover-elevate cursor-pointer transition-all">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
                          <Dumbbell className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {workout.title}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5 flex-wrap">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {format(new Date(workout.performed_at), "MMM d, yyyy")}
                            </span>
                            {workout.duration_minutes && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {workout.duration_minutes}min
                              </span>
                            )}
                            <span>
                              {uniqueExercises.size} exercises &middot;{" "}
                              {workoutSets.length} sets
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
