"use client";

import { useAuth } from "@/components/auth-provider";
import { getWorkout, getWorkoutSets, getExercises, deleteWorkout } from "@/lib/firebase/firestore";
import type { Workout, WorkoutSet, Exercise } from "@/lib/types";
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
    if (!confirm("Delete this workout? This cannot be undone.")) return;
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
      <div className="mx-auto max-w-3xl px-4 py-8 text-center space-y-4">
        <p className="text-muted-foreground">Workout not found.</p>
        <Link href="/workouts">
          <Button variant="outline">Back to Workouts</Button>
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
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/workouts">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate" data-testid="text-workout-title">
            {workout.title}
          </h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {format(new Date(workout.performed_at), "MMMM d, yyyy")}
            </span>
            {workout.duration_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {workout.duration_minutes} min
              </span>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
          className="shrink-0"
          data-testid="button-delete-workout"
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Delete
        </Button>
      </div>

      {workout.notes && (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">{workout.notes}</p>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold" data-testid="text-exercise-count">
            {Object.keys(groupedByExercise).length}
          </p>
          <p className="text-sm text-muted-foreground">Exercises</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold" data-testid="text-set-count">
            {sets.length}
          </p>
          <p className="text-sm text-muted-foreground">Sets</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold" data-testid="text-volume">
            {totalVolume > 0 ? `${(totalVolume / 1000).toFixed(1)}t` : "-"}
          </p>
          <p className="text-sm text-muted-foreground">Volume</p>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Exercises & Sets</h2>

        {Object.entries(groupedByExercise).length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No sets recorded for this workout.
            </p>
          </Card>
        ) : (
          Object.entries(groupedByExercise).map(([exerciseId, exSets]) => {
            const exercise = exerciseMap.get(exerciseId);
            return (
              <Card key={exerciseId} className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 shrink-0">
                    <Dumbbell className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {exercise?.name || "Unknown Exercise"}
                    </p>
                    {exercise?.muscle_group && (
                      <Badge variant="secondary" className="mt-1">
                        {exercise.muscle_group.replace("_", " ")}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="border rounded-md overflow-hidden">
                  <div className="grid grid-cols-3 gap-0 text-xs font-medium text-muted-foreground p-2 bg-muted/50">
                    <span>Set</span>
                    <span>Reps</span>
                    <span>Weight (kg)</span>
                  </div>
                  {exSets.map((s) => (
                    <div
                      key={s.id}
                      className="grid grid-cols-3 gap-0 text-sm p-2 border-t"
                      data-testid={`row-set-${s.id}`}
                    >
                      <span className="font-mono text-muted-foreground">
                        {s.set_number}
                      </span>
                      <span>{s.reps ?? "-"}</span>
                      <span>{s.weight ? Number(s.weight) : "-"}</span>
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
