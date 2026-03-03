"use client";

import { useAuth } from "@/components/auth-provider";
import {
  getExercises,
  addExercise,
  updateExercise,
  deleteExercise,
} from "@/lib/firebase/firestore";
import type { Exercise } from "@/lib/types";
import { EXERCISE_CATEGORIES, MUSCLE_GROUPS } from "@/lib/types";
import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  ListChecks,
  Search,
  Pencil,
  Check,
  X,
} from "lucide-react";

export default function ExercisesPage() {
  const { user } = useAuth();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("barbell");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editMuscle, setEditMuscle] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchExercises = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getExercises(user.uid);
      setExercises(data);
    } catch (err) {
      console.error("Exercises fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const handleAdd = async () => {
    if (!name.trim() || !user) {
      setError("Exercise name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const data = await addExercise({
        user_id: user.uid,
        name: name.trim(),
        category,
        muscle_group: muscleGroup || null,
      });
      setExercises((prev) =>
        [...prev, data].sort((a, b) => a.name.localeCompare(b.name))
      );
      setName("");
      setCategory("barbell");
      setMuscleGroup("");
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add exercise");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this exercise? Related sets will also be removed.")) return;
    await deleteExercise(id);
    setExercises((prev) => prev.filter((e) => e.id !== id));
  };

  const startEdit = (ex: Exercise) => {
    setEditingId(ex.id);
    setEditName(ex.name);
    setEditCategory(ex.category);
    setEditMuscle(ex.muscle_group || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditCategory("");
    setEditMuscle("");
  };

  const saveEdit = async () => {
    if (!editName.trim() || !editingId) return;
    setUpdating(true);
    try {
      const data = await updateExercise(editingId, {
        name: editName.trim(),
        category: editCategory,
        muscle_group: editMuscle || null,
      });
      setExercises((prev) =>
        prev
          .map((e) => (e.id === editingId ? data : e))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      cancelEdit();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
    setUpdating(false);
  };

  const filtered = exercises.filter((ex) => {
    const matchSearch = ex.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchCategory =
      filterCategory === "all" || ex.category === filterCategory;
    return matchSearch && matchCategory;
  });

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
          <h1 className="text-2xl font-bold" data-testid="text-exercises-title">
            Exercise Library
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {exercises.length} exercise{exercises.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          data-testid="button-add-exercise"
        >
          <Plus className="h-4 w-4" />
          Add Exercise
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm" data-testid="text-error">
          {error}
        </div>
      )}

      {showForm && (
        <Card className="p-5 space-y-4 border-dashed border-2">
          <p className="font-medium">New Exercise</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                placeholder="e.g., Bench Press"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-exercise-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="select-exercise-category">
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
            <div className="space-y-2">
              <Label>Muscle Group</Label>
              <Select value={muscleGroup} onValueChange={setMuscleGroup}>
                <SelectTrigger data-testid="select-exercise-muscle">
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
              onClick={handleAdd}
              disabled={saving || !name.trim()}
              data-testid="button-save-exercise"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-exercises"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[150px]" data-testid="select-filter-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {EXERCISE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mx-auto">
            <ListChecks className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">
              {exercises.length === 0
                ? "No exercises yet"
                : "No exercises match your search"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {exercises.length === 0
                ? 'Add exercises to build your personal library.'
                : "Try adjusting your search or filter."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((ex) => (
            <Card key={ex.id} className="p-4" data-testid={`card-exercise-${ex.id}`}>
              {editingId === ex.id ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 min-w-[120px]"
                    data-testid="input-edit-name"
                  />
                  <Select value={editCategory} onValueChange={setEditCategory}>
                    <SelectTrigger className="w-[120px]">
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
                  <Select value={editMuscle || "none"} onValueChange={(v) => setEditMuscle(v === "none" ? "" : v)}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Muscle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {MUSCLE_GROUPS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon"
                    onClick={saveEdit}
                    disabled={updating}
                    data-testid="button-save-edit"
                  >
                    {updating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={cancelEdit}
                    data-testid="button-cancel-edit"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-wrap">
                    <p className="font-medium">{ex.name}</p>
                    <Badge variant="secondary">
                      {ex.category}
                    </Badge>
                    {ex.muscle_group && (
                      <Badge variant="outline">
                        {ex.muscle_group.replace("_", " ")}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(ex)}
                      data-testid={`button-edit-${ex.id}`}
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(ex.id)}
                      data-testid={`button-delete-${ex.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
