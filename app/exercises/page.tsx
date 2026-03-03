"use client";

import { useAuth } from "@/components/auth-provider";
import {
  getExercises,
  addExercise,
  updateExercise,
  deleteExercise,
} from "@/lib/firebase/firestore";
import type { Exercise, MuscleGroup } from "@/lib/types";
import { EXERCISE_CATEGORIES, MUSCLE_GROUPS, MUSCLE_GROUP_LABELS } from "@/lib/types";
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
      setError("운동 이름을 입력해주세요.");
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
        parent_id: null,
      });
      setExercises((prev) =>
        [...prev, data].sort((a, b) => a.name.localeCompare(b.name))
      );
      setName("");
      setCategory("barbell");
      setMuscleGroup("");
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "운동 추가에 실패했습니다");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 운동을 삭제하시겠습니까?")) return;
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
      setError(err instanceof Error ? err.message : "수정에 실패했습니다");
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
    <div className="mx-auto max-w-lg md:max-w-4xl px-4 py-5 md:py-8 space-y-4 md:space-y-6 pb-20 md:pb-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold" data-testid="text-exercises-title">
            운동목록
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-0.5">
            총 {exercises.length}개 운동
          </p>
        </div>
        <Button
          size="sm"
          className="h-9 gap-1.5"
          onClick={() => setShowForm(!showForm)}
          data-testid="button-add-exercise"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">추가</span>
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm" data-testid="text-error">
          {error}
        </div>
      )}

      {showForm && (
        <Card className="p-4 space-y-3 border-dashed border-2">
          <p className="text-sm font-medium">새 운동 추가</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">이름 *</Label>
              <Input
                placeholder="예: 벤치프레스"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9"
                data-testid="input-exercise-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">카테고리</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-9" data-testid="select-exercise-category">
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
              <div className="space-y-1.5">
                <Label className="text-xs">운동 부위</Label>
                <Select value={muscleGroup} onValueChange={setMuscleGroup}>
                  <SelectTrigger className="h-9" data-testid="select-exercise-muscle">
                    <SelectValue placeholder="선택..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MUSCLE_GROUPS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {MUSCLE_GROUP_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-8"
              onClick={handleAdd}
              disabled={saving || !name.trim()}
              data-testid="button-save-exercise"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              저장
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => setShowForm(false)}
            >
              취소
            </Button>
          </div>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="운동 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
            data-testid="input-search-exercises"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[110px] md:w-[150px] h-9 text-sm" data-testid="select-filter-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {EXERCISE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-10 md:p-12 text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-muted mx-auto">
            <ListChecks className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm">
              {exercises.length === 0
                ? "아직 등록된 운동이 없습니다"
                : "검색 결과가 없습니다"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {exercises.length === 0
                ? "운동을 추가하여 나만의 라이브러리를 만들어보세요."
                : "검색어나 필터를 변경해보세요."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((ex) => (
            <Card key={ex.id} className="p-3 md:p-4" data-testid={`card-exercise-${ex.id}`}>
              {editingId === ex.id ? (
                <div className="space-y-3">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-9"
                    data-testid="input-edit-name"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={editCategory} onValueChange={setEditCategory}>
                      <SelectTrigger className="h-9">
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
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="부위" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">없음</SelectItem>
                        {MUSCLE_GROUPS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {MUSCLE_GROUP_LABELS[m]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-8"
                      onClick={saveEdit}
                      disabled={updating}
                      data-testid="button-save-edit"
                    >
                      {updating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      저장
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      onClick={cancelEdit}
                      data-testid="button-cancel-edit"
                    >
                      <X className="h-3.5 w-3.5" />
                      취소
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <p className="text-sm font-medium">{ex.name}</p>
                    <Badge variant="secondary" className="text-[10px] h-5">
                      {ex.category}
                    </Badge>
                    {ex.muscle_group && (
                      <Badge variant="outline" className="text-[10px] h-5">
                        {MUSCLE_GROUP_LABELS[ex.muscle_group as MuscleGroup] || ex.muscle_group}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => startEdit(ex)}
                      data-testid={`button-edit-${ex.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDelete(ex.id)}
                      data-testid={`button-delete-${ex.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
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
