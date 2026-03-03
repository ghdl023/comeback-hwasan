"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  getExercises,
  getExercisesByMuscleGroup,
  getChildExercises,
  getExerciseCountsByMuscleGroup,
} from "@/lib/firebase/firestore";
import type { Exercise, MuscleGroup } from "@/lib/types";
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABELS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Search,
  X,
  ChevronRight,
  Loader2,
  Dumbbell,
} from "lucide-react";

interface ExerciseSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (exercises: Exercise[]) => void;
  initialSelected?: Exercise[];
}

type ViewLevel = "muscle_groups" | "exercises" | "sub_exercises";

interface NavigationState {
  level: ViewLevel;
  muscleGroup?: MuscleGroup;
  parentExercise?: Exercise;
}

export function ExerciseSelector({
  open,
  onClose,
  onSelect,
  initialSelected = [],
}: ExerciseSelectorProps) {
  const { user } = useAuth();
  const [nav, setNav] = useState<NavigationState>({ level: "muscle_groups" });
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<Exercise[]>(initialSelected);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [muscleGroupCounts, setMuscleGroupCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      setNav({ level: "muscle_groups" });
      setSearchQuery("");
      setSelected(initialSelected);
      loadMuscleGroupCounts();
      loadAllExercises();
    }
  }, [open, user]);

  const loadMuscleGroupCounts = async () => {
    if (!user) return;
    try {
      const counts = await getExerciseCountsByMuscleGroup(user.uid);
      setMuscleGroupCounts(counts);
    } catch {
      setMuscleGroupCounts({});
    }
  };

  const loadAllExercises = async () => {
    if (!user) return;
    try {
      const all = await getExercises(user.uid);
      setAllExercises(all);
    } catch {
      setAllExercises([]);
    }
  };

  const loadExercisesForMuscleGroup = async (mg: MuscleGroup) => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getExercisesByMuscleGroup(user.uid, mg);
      setExercises(data);
    } catch {
      setExercises([]);
    } finally {
      setLoading(false);
    }
  };

  const loadChildExercises = async (parent: Exercise) => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getChildExercises(user.uid, parent.id);
      setExercises(data);
    } catch {
      setExercises([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMuscleGroupClick = (mg: MuscleGroup) => {
    setNav({ level: "exercises", muscleGroup: mg });
    loadExercisesForMuscleGroup(mg);
  };

  const handleExerciseClick = (exercise: Exercise) => {
    setNav({ level: "sub_exercises", muscleGroup: nav.muscleGroup, parentExercise: exercise });
    loadChildExercises(exercise);
  };

  const handleSelectExercise = (exercise: Exercise) => {
    setSelected((prev) => {
      const exists = prev.find((e) => e.id === exercise.id);
      if (exists) {
        return prev.filter((e) => e.id !== exercise.id);
      }
      return [...prev, exercise];
    });
  };

  const handleRemoveSelected = (exerciseId: string) => {
    setSelected((prev) => prev.filter((e) => e.id !== exerciseId));
  };

  const handleBack = () => {
    if (nav.level === "sub_exercises" && nav.muscleGroup) {
      setNav({ level: "exercises", muscleGroup: nav.muscleGroup });
      loadExercisesForMuscleGroup(nav.muscleGroup);
    } else {
      setNav({ level: "muscle_groups" });
      setExercises([]);
    }
  };

  const handleConfirm = () => {
    onSelect(selected);
    onClose();
  };

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allExercises.filter((e) => e.name.toLowerCase().includes(q));
  }, [searchQuery, allExercises]);

  const isSearching = searchQuery.trim().length > 0;

  const headerTitle = useMemo(() => {
    if (isSearching) return "검색 결과";
    if (nav.level === "muscle_groups") return "운동 부위 선택";
    if (nav.level === "exercises" && nav.muscleGroup) {
      return MUSCLE_GROUP_LABELS[nav.muscleGroup];
    }
    if (nav.level === "sub_exercises" && nav.parentExercise) {
      return nav.parentExercise.name;
    }
    return "운동 선택";
  }, [nav, isSearching]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" data-testid="exercise-selector">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b bg-background shrink-0 safe-area-top">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-9 w-9"
          onClick={isSearching ? () => setSearchQuery("") : nav.level === "muscle_groups" ? onClose : handleBack}
          data-testid="button-selector-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="운동 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
            data-testid="input-exercise-search"
          />
          {searchQuery && (
            <button
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

      </div>

      {!isSearching && nav.level !== "muscle_groups" && (
        <div className="px-4 py-2 border-b bg-muted/30">
          <p className="text-sm font-medium text-foreground">{headerTitle}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {isSearching ? (
          <SearchResultsView
            results={searchResults}
            selected={selected}
            onSelect={handleSelectExercise}
          />
        ) : nav.level === "muscle_groups" ? (
          <MuscleGroupsView
            counts={muscleGroupCounts}
            onSelect={handleMuscleGroupClick}
          />
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : nav.level === "exercises" ? (
          <ExerciseListView
            exercises={exercises}
            selected={selected}
            onClickExercise={handleExerciseClick}
            onSelectExercise={handleSelectExercise}
            showChevron={true}
          />
        ) : (
          <ExerciseListView
            exercises={exercises}
            selected={selected}
            onSelectExercise={handleSelectExercise}
            showChevron={false}
          />
        )}
      </div>

      {selected.length > 0 && (
        <div className="border-t bg-background shrink-0 safe-area-bottom">
          <div className="px-3 py-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">
                선택된 운동 ({selected.length})
              </p>
              <Button
                size="sm"
                className="h-8 text-xs"
                onClick={handleConfirm}
                data-testid="button-confirm-selection"
              >
                추가하기
              </Button>
            </div>
            <ScrollArea className="w-full">
              <div className="flex gap-1.5 pb-1">
                {selected.map((ex) => (
                  <Badge
                    key={ex.id}
                    variant="secondary"
                    className="shrink-0 gap-1 pr-1 cursor-pointer"
                    onClick={() => handleRemoveSelected(ex.id)}
                    data-testid={`badge-selected-${ex.id}`}
                  >
                    {ex.name}
                    <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}

function MuscleGroupsView({
  counts,
  onSelect,
}: {
  counts: Record<string, number>;
  onSelect: (mg: MuscleGroup) => void;
}) {
  return (
    <div className="divide-y">
      {MUSCLE_GROUPS.map((mg) => (
        <button
          key={mg}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 active:bg-muted transition-colors text-left"
          onClick={() => onSelect(mg)}
          data-testid={`button-muscle-group-${mg}`}
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 shrink-0">
            <Dumbbell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{MUSCLE_GROUP_LABELS[mg]}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {counts[mg] || 0}개 운동
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      ))}
    </div>
  );
}

function ExerciseListView({
  exercises,
  selected,
  onClickExercise,
  onSelectExercise,
  showChevron,
}: {
  exercises: Exercise[];
  selected: Exercise[];
  onClickExercise?: (ex: Exercise) => void;
  onSelectExercise: (ex: Exercise) => void;
  showChevron: boolean;
}) {
  if (exercises.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
          <Dumbbell className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">등록된 운동이 없습니다</p>
        <p className="text-xs text-muted-foreground mt-1">운동목록에서 운동을 추가해주세요</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {exercises.map((ex) => {
        const isSelected = selected.some((s) => s.id === ex.id);
        return (
          <div
            key={ex.id}
            className="flex items-center"
          >
            <button
              className="flex-1 flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 active:bg-muted transition-colors text-left min-w-0"
              onClick={() => {
                if (showChevron && onClickExercise) {
                  onClickExercise(ex);
                } else {
                  onSelectExercise(ex);
                }
              }}
              data-testid={`button-exercise-${ex.id}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ex.name}</p>
                {ex.category && (
                  <p className="text-xs text-muted-foreground mt-0.5">{ex.category}</p>
                )}
              </div>
              {showChevron && (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>
            {!showChevron && (
              <button
                className={`px-4 py-3.5 shrink-0 transition-colors ${
                  isSelected ? "text-primary" : "text-muted-foreground"
                }`}
                onClick={() => onSelectExercise(ex)}
                data-testid={`button-toggle-exercise-${ex.id}`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/30"
                  }`}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SearchResultsView({
  results,
  selected,
  onSelect,
}: {
  results: Exercise[];
  selected: Exercise[];
  onSelect: (ex: Exercise) => void;
}) {
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <Search className="h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">검색 결과가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {results.map((ex) => {
        const isSelected = selected.some((s) => s.id === ex.id);
        return (
          <button
            key={ex.id}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 active:bg-muted transition-colors text-left"
            onClick={() => onSelect(ex)}
            data-testid={`button-search-result-${ex.id}`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{ex.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {ex.muscle_group && (
                  <span className="text-xs text-muted-foreground">
                    {MUSCLE_GROUP_LABELS[ex.muscle_group as MuscleGroup] || ex.muscle_group}
                  </span>
                )}
                {ex.category && (
                  <span className="text-xs text-muted-foreground">{ex.category}</span>
                )}
              </div>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                isSelected
                  ? "border-primary bg-primary"
                  : "border-muted-foreground/30"
              }`}
            >
              {isSelected && (
                <svg className="w-3 h-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
