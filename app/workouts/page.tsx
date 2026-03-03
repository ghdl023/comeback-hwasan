"use client";

import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";
import type { Workout, WorkoutSet } from "@/lib/types";
import { useEffect, useState, useCallback, useMemo } from "react";
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

export default function WorkoutsPage() {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [workoutsRes, setsRes] = await Promise.all([
      supabase
        .from("workouts")
        .select("*")
        .order("performed_at", { ascending: false }),
      supabase.from("workout_sets").select("*"),
    ]);
    if (workoutsRes.data) setWorkouts(workoutsRes.data);
    if (setsRes.data) setSets(setsRes.data);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this workout? This cannot be undone.")) return;
    setDeleting(id);
    await supabase.from("workouts").delete().eq("id", id);
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
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-workouts-title">
            Workouts
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {workouts.length} workout{workouts.length !== 1 ? "s" : ""} logged
          </p>
        </div>
        <Link href="/workouts/new">
          <Button data-testid="button-new-workout">
            <Plus className="h-4 w-4" />
            New Workout
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
              Start by logging your first workout.
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
                <Card className="p-4 hover-elevate cursor-pointer transition-all">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
                        <Dumbbell className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{workout.title}</p>
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
                            {uniqueExercises.size} ex &middot;{" "}
                            {workoutSets.length} sets
                          </span>
                          {volume > 0 && (
                            <span>{(volume / 1000).toFixed(1)}t vol</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDelete(workout.id, e)}
                        disabled={deleting === workout.id}
                        data-testid={`button-delete-workout-${workout.id}`}
                      >
                        {deleting === workout.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
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
