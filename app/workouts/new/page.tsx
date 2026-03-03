"use client";

import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";
import type { Exercise } from "@/lib/types";
import { EXERCISE_CATEGORIES, MUSCLE_GROUPS } from "@/lib/types";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  Dumbbell,
} from "lucide-react";
import Link from "next/link";

interface SetEntry {
  tempId: string;
  exercise_id: string;
  set_number: number;
  reps: string;
  weight: string;
}

export default function NewWorkoutPage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [performedAt, setPerformedAt] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [durationMinutes, setDurationMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [sets, setSets] = useState<SetEntry[]>([]);

  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [newExName, setNewExName] = useState("");
  const [newExCategory, setNewExCategory] = useState("barbell");
  const [newExMuscle, setNewExMuscle] = useState("");
  const [addingExercise, setAddingExercise] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchExercises = async () => {
      const { data } = await supabase
        .from("exercises")
        .select("*")
        .order("name");
      if (data) setExercises(data);
      setLoading(false);
    };
    fetchExercises();
  }, [user, supabase]);

  const addSet = () => {
    if (exercises.length === 0) {
      setShowExerciseForm(true);
      return;
    }
    setSets((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        exercise_id: exercises[0]?.id || "",
        set_number: prev.length + 1,
        reps: "",
        weight: "",
      },
    ]);
  };

  const removeSet = (tempId: string) => {
    setSets((prev) => {
      const filtered = prev.filter((s) => s.tempId !== tempId);
      return filtered.map((s, i) => ({ ...s, set_number: i + 1 }));
    });
  };

  const updateSet = (
    tempId: string,
    field: keyof SetEntry,
    value: string
  ) => {
    setSets((prev) =>
      prev.map((s) => (s.tempId === tempId ? { ...s, [field]: value } : s))
    );
  };

  const addExercise = async () => {
    if (!newExName.trim()) return;
    setAddingExercise(true);
    const { data, error: err } = await supabase
      .from("exercises")
      .insert({
        user_id: user!.id,
        name: newExName.trim(),
        category: newExCategory,
        muscle_group: newExMuscle || null,
      })
      .select()
      .single();
    if (data) {
      setExercises((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewExName("");
      setNewExCategory("barbell");
      setNewExMuscle("");
      setShowExerciseForm(false);
    }
    if (err) setError(err.message);
    setAddingExercise(false);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Please enter a workout title.");
      return;
    }
    if (sets.length === 0) {
      setError("Please add at least one set.");
      return;
    }
    for (const s of sets) {
      if (!s.exercise_id) {
        setError("Please select an exercise for each set.");
        return;
      }
    }

    setSaving(true);
    setError("");

    const { data: workout, error: workoutErr } = await supabase
      .from("workouts")
      .insert({
        user_id: user!.id,
        title: title.trim(),
        performed_at: performedAt,
        duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
        notes: notes.trim() || null,
      })
      .select()
      .single();

    if (workoutErr || !workout) {
      setError(workoutErr?.message || "Failed to create workout.");
      setSaving(false);
      return;
    }

    const setsToInsert = sets.map((s) => ({
      workout_id: workout.id,
      exercise_id: s.exercise_id,
      set_number: s.set_number,
      reps: s.reps ? parseInt(s.reps) : null,
      weight: s.weight ? parseFloat(s.weight) : null,
    }));

    const { error: setsErr } = await supabase
      .from("workout_sets")
      .insert(setsToInsert);

    if (setsErr) {
      setError(setsErr.message);
      setSaving(false);
      return;
    }

    router.push(`/workouts/${workout.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/workouts">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold" data-testid="text-new-workout-title">
          New Workout
        </h1>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm" data-testid="text-error">
          {error}
        </div>
      )}

      <Card className="p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Workout Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Upper Body Day"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="input-title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={performedAt}
              onChange={(e) => setPerformedAt(e.target.value)}
              data-testid="input-date"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (min)</Label>
            <Input
              id="duration"
              type="number"
              placeholder="e.g., 60"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              data-testid="input-duration"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              placeholder="Optional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              data-testid="input-notes"
            />
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Sets</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExerciseForm(!showExerciseForm)}
              data-testid="button-toggle-exercise-form"
            >
              <Plus className="h-4 w-4" />
              New Exercise
            </Button>
            <Button size="sm" onClick={addSet} data-testid="button-add-set">
              <Plus className="h-4 w-4" />
              Add Set
            </Button>
          </div>
        </div>

        {showExerciseForm && (
          <Card className="p-4 space-y-4 border-dashed border-2">
            <p className="text-sm font-medium">Quick Add Exercise</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Name *</Label>
                <Input
                  placeholder="e.g., Bench Press"
                  value={newExName}
                  onChange={(e) => setNewExName(e.target.value)}
                  data-testid="input-new-exercise-name"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Select value={newExCategory} onValueChange={setNewExCategory}>
                  <SelectTrigger data-testid="select-new-exercise-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXERCISE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Muscle Group</Label>
                <Select value={newExMuscle} onValueChange={setNewExMuscle}>
                  <SelectTrigger data-testid="select-new-exercise-muscle">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MUSCLE_GROUPS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={addExercise}
                disabled={addingExercise || !newExName.trim()}
                data-testid="button-save-exercise"
              >
                {addingExercise && <Loader2 className="h-4 w-4 animate-spin" />}
                Add Exercise
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExerciseForm(false)}
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {sets.length === 0 ? (
          <Card className="p-8 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-muted mx-auto">
              <Dumbbell className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No sets added yet. Click &ldquo;Add Set&rdquo; to start logging.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {sets.map((s, index) => (
              <Card key={s.tempId} className="p-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-mono text-muted-foreground w-8 shrink-0">
                    #{s.set_number}
                  </span>
                  <div className="flex-1 min-w-[140px]">
                    <Select
                      value={s.exercise_id}
                      onValueChange={(v) => updateSet(s.tempId, "exercise_id", v)}
                    >
                      <SelectTrigger data-testid={`select-exercise-${index}`}>
                        <SelectValue placeholder="Exercise" />
                      </SelectTrigger>
                      <SelectContent>
                        {exercises.map((ex) => (
                          <SelectItem key={ex.id} value={ex.id}>
                            {ex.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      placeholder="Reps"
                      value={s.reps}
                      onChange={(e) => updateSet(s.tempId, "reps", e.target.value)}
                      data-testid={`input-reps-${index}`}
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      placeholder="kg"
                      step="0.5"
                      value={s.weight}
                      onChange={(e) => updateSet(s.tempId, "weight", e.target.value)}
                      data-testid={`input-weight-${index}`}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSet(s.tempId)}
                    data-testid={`button-remove-set-${index}`}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Link href="/workouts">
          <Button variant="outline" data-testid="button-cancel">
            Cancel
          </Button>
        </Link>
        <Button onClick={handleSave} disabled={saving} data-testid="button-save-workout">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Workout
        </Button>
      </div>
    </div>
  );
}
