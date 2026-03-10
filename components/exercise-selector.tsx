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
import {
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUP_ICONS,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Search,
  Plus,
  X,
  ChevronRight,
  Loader2,
  Dumbbell,
  Check,
} from "lucide-react";

export interface ExistingDayExercise {
  exercise: Exercise;
  completed: boolean;
}

interface ExerciseSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (exercises: Exercise[]) => void;
  onAddExercise?: () => void;
  initialSelected?: Exercise[];
  existingDayExercises?: ExistingDayExercise[];
  onBackRef?: React.MutableRefObject<(() => boolean) | null>;
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
  onAddExercise,
  initialSelected = [],
  existingDayExercises = [],
  onBackRef,
}: ExerciseSelectorProps) {
  const { user } = useAuth();
  const [nav, setNav] = useState<NavigationState>({ level: "muscle_groups" });
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<Exercise[]>(initialSelected);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [muscleGroupCounts, setMuscleGroupCounts] = useState<
    Record<string, number>
  >({});
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
    setNav({
      level: "sub_exercises",
      muscleGroup: nav.muscleGroup,
      parentExercise: exercise,
    });
    loadChildExercises(exercise);
  };

  const existingExerciseIds = useMemo(
    () => new Set(existingDayExercises.map((e) => e.exercise.id)),
    [existingDayExercises],
  );

  const handleSelectExercise = (exercise: Exercise) => {
    if (existingExerciseIds.has(exercise.id)) return;
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

  useEffect(() => {
    if (!onBackRef) return;
    const searching = searchQuery.trim().length > 0;
    onBackRef.current = () => {
      if (searching) {
        setSearchQuery("");
        return true;
      }
      if (nav.level === "sub_exercises" || nav.level === "exercises") {
        handleBack();
        return true;
      }
      return false;
    };
    return () => { onBackRef.current = null; };
  }, [nav, searchQuery]);

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
    <div
      className="fixed inset-0 z-50 bg-background flex flex-col"
      data-testid="exercise-selector"
    >
      <div className="flex items-center gap-2 mt-3 px-3 pt-4 pb-2.5 border-b bg-background shrink-0 safe-area-top">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-9 w-9"
          onClick={
            isSearching
              ? () => setSearchQuery("")
              : nav.level === "muscle_groups"
                ? onClose
                : handleBack
          }
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

        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-9 w-9"
          onClick={onAddExercise}
          data-testid="button-selector-add"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {!isSearching && nav.level !== "muscle_groups" && (
        <div className="px-4 py-2 border-b bg-muted/30">
          <p className="text-sm font-medium text-foreground">{headerTitle}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide">
        {isSearching ? (
          <SearchResultsView
            results={searchResults}
            selected={selected}
            onSelect={handleSelectExercise}
            existingIds={existingExerciseIds}
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
            existingIds={existingExerciseIds}
          />
        ) : (
          <ExerciseListView
            exercises={exercises}
            selected={selected}
            onSelectExercise={handleSelectExercise}
            showChevron={false}
            existingIds={existingExerciseIds}
          />
        )}
      </div>

      <div className="border-t bg-background shrink-0 safe-area-bottom">
        {existingDayExercises.length > 0 || selected.length > 0 ? (
          <div className="px-3 pt-2.5 pb-2">
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 pb-2 pt-2 px-1">
                {existingDayExercises.map((item) => {
                  const ex = item.exercise;
                  return (
                    <div
                      key={`existing-${ex.id}`}
                      className={`shrink-0 w-16 h-16 rounded-lg border flex flex-col items-center justify-center gap-0.5 p-1 relative ${
                        item.completed
                          ? "border-primary/30 bg-primary/5 opacity-50"
                          : "border-border/60 bg-card shadow-sm"
                      }`}
                      data-testid={`card-existing-${ex.id}`}
                    >
                      {item.completed && (
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check className="h-2.5 w-2.5" />
                        </div>
                      )}
                      <p className="text-[9px] text-muted-foreground leading-tight text-center line-clamp-1">
                        {ex.muscle_group
                          ? MUSCLE_GROUP_LABELS[
                              ex.muscle_group as MuscleGroup
                            ] || ex.muscle_group
                          : "-"}
                      </p>
                      <p
                        className={`text-[10px] font-medium leading-tight text-center line-clamp-2 ${item.completed ? "text-muted-foreground" : ""}`}
                      >
                        {ex.name}
                      </p>
                      {item.completed && (
                        <p className="text-[8px] text-primary font-semibold">
                          완료
                        </p>
                      )}
                    </div>
                  );
                })}
                {selected
                  .filter(
                    (ex) =>
                      !existingDayExercises.some(
                        (e) => e.exercise.id === ex.id,
                      ),
                  )
                  .map((ex) => (
                    <button
                      key={ex.id}
                      className="shrink-0 w-16 h-16 rounded-lg border border-primary/40 bg-primary/5 shadow-sm flex flex-col items-center justify-center gap-0.5 p-1 relative group"
                      onClick={() => handleRemoveSelected(ex.id)}
                      data-testid={`card-selected-${ex.id}`}
                    >
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                        <X className="h-2.5 w-2.5" />
                      </div>
                      <p className="text-[9px] text-muted-foreground leading-tight text-center line-clamp-1">
                        {ex.muscle_group
                          ? MUSCLE_GROUP_LABELS[
                              ex.muscle_group as MuscleGroup
                            ] || ex.muscle_group
                          : "-"}
                      </p>
                      <p className="text-[10px] font-medium leading-tight text-center line-clamp-2">
                        {ex.name}
                      </p>
                    </button>
                  ))}
              </div>
            </div>
            {selected.filter(
              (ex) =>
                !existingDayExercises.some((e) => e.exercise.id === ex.id),
            ).length > 0 && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="h-9 px-5 text-sm"
                  onClick={handleConfirm}
                  data-testid="button-confirm-selection"
                >
                  완료
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="px-3 py-3 flex items-center justify-center">
            <p className="text-xs text-muted-foreground">운동을 선택해주세요</p>
          </div>
        )}
      </div>
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
    <div className="p-4 grid grid-cols-3 gap-3">
      {MUSCLE_GROUPS.map((mg) => (
        <button
          key={mg}
          className="flex flex-col items-center gap-2 p-3.5 rounded-xl border border-border/60 bg-card shadow-sm hover:shadow-md hover:border-primary/30 active:bg-muted transition-all text-center"
          onClick={() => onSelect(mg)}
          data-testid={`button-muscle-group-${mg}`}
        >
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 shrink-0 overflow-hidden">
            <img
              src={MUSCLE_GROUP_ICONS[mg]}
              alt={MUSCLE_GROUP_LABELS[mg]}
              className="w-10 h-10 object-contain"
            />
          </div>
          <div>
            <p className="font-medium text-sm leading-tight">
              {MUSCLE_GROUP_LABELS[mg]}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {counts[mg] || 0}개
            </p>
          </div>
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
  existingIds = new Set(),
}: {
  exercises: Exercise[];
  selected: Exercise[];
  onClickExercise?: (ex: Exercise) => void;
  onSelectExercise: (ex: Exercise) => void;
  showChevron: boolean;
  existingIds?: Set<string>;
}) {
  if (exercises.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
          <Dumbbell className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">등록된 운동이 없습니다</p>
        <p className="text-xs text-muted-foreground mt-1">
          운동목록에서 운동을 추가해주세요
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {exercises.map((ex) => {
        const isSelected = selected.some((s) => s.id === ex.id);
        const isExisting = existingIds.has(ex.id);
        return (
          <div
            key={ex.id}
            className={`flex items-center ${isExisting ? "opacity-50" : ""}`}
          >
            <button
              className="flex-1 flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 active:bg-muted transition-colors text-left min-w-0"
              onClick={() => {
                if (isExisting) return;
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
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ex.category}
                  </p>
                )}
              </div>
              {isExisting ? (
                <span className="text-xs text-muted-foreground shrink-0">
                  추가됨
                </span>
              ) : showChevron ? (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : null}
            </button>
            {!showChevron && !isExisting && (
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
                    <svg
                      className="w-3 h-3 text-primary-foreground"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
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
  existingIds = new Set(),
}: {
  results: Exercise[];
  selected: Exercise[];
  onSelect: (ex: Exercise) => void;
  existingIds?: Set<string>;
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
        const isExisting = existingIds.has(ex.id);
        return (
          <button
            key={ex.id}
            className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 active:bg-muted transition-colors text-left ${isExisting ? "opacity-50" : ""}`}
            onClick={() => {
              if (!isExisting) onSelect(ex);
            }}
            data-testid={`button-search-result-${ex.id}`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{ex.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {ex.muscle_group && (
                  <span className="text-xs text-muted-foreground">
                    {MUSCLE_GROUP_LABELS[ex.muscle_group as MuscleGroup] ||
                      ex.muscle_group}
                  </span>
                )}
                {ex.category && (
                  <span className="text-xs text-muted-foreground">
                    {ex.category}
                  </span>
                )}
              </div>
            </div>
            {isExisting ? (
              <span className="text-xs text-muted-foreground shrink-0">
                추가됨
              </span>
            ) : (
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                  isSelected
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30"
                }`}
              >
                {isSelected && (
                  <svg
                    className="w-3 h-3 text-primary-foreground"
                    viewBox="0 0 12 12"
                    fill="none"
                  >
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
