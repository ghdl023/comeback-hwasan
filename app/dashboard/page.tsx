"use client";

import { useAuth } from "@/components/auth-provider";
import {
  getWorkouts,
  getWorkoutSetsByUser,
  getExercises,
  getBodyRecord,
  saveBodyRecord,
  getMemos,
  addMemo,
  updateMemo,
  deleteMemo,
  addWorkout,
  addWorkoutSets,
  deleteExerciseSetsFromWorkouts,
} from "@/lib/firebase/firestore";
import type { Workout, WorkoutSet, Exercise, MuscleGroup, Memo } from "@/lib/types";
import { MUSCLE_GROUP_LABELS } from "@/lib/types";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AppShell } from "@/components/app-shell";
import { ExerciseSelector } from "@/components/exercise-selector";
import { SetEditor } from "@/components/set-editor";
import {
  Loader2,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  CalendarCheck,
  Repeat,
  Dumbbell,
  Clock,
  Weight,
  Plus,
  ArrowLeft,
  Save,
  StickyNote,
  Check,
  Trash2,
} from "lucide-react";

type DetailTab = "exercises" | "body" | "memo";

interface DayCell {
  date: Date;
  isCurrentMonth: boolean;
}

interface WeekRow {
  weekNumber: number;
  days: DayCell[];
}

interface DayInfo {
  duration: number;
  setCount: number;
  workoutCount: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [currentMonth, setCurrentMonth] = useState(() => {
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const monthPickerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("exercises");

  const [bodyWeight, setBodyWeight] = useState("");
  const [skeletalMuscle, setSkeletalMuscle] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [bodySaving, setBodySaving] = useState(false);

  const [memos, setMemos] = useState<Memo[]>([]);
  const [memoAddOpen, setMemoAddOpen] = useState(false);
  const [memoContent, setMemoContent] = useState("");
  const [memoShowOnCalendar, setMemoShowOnCalendar] = useState(false);
  const [memoSaving, setMemoSaving] = useState(false);
  const [editingMemo, setEditingMemo] = useState<Memo | null>(null);
  const [exerciseSelectorOpen, setExerciseSelectorOpen] = useState(false);
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());
  const [setEditExerciseId, setSetEditExerciseId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const [w, s, e] = await Promise.all([
          getWorkouts(user.uid).catch(() => [] as Workout[]),
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

  const selectedDateStr = useMemo(() => {
    return `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
  }, [selectedDate]);

  useEffect(() => {
    if (!user) return;
    setBodyWeight("");
    setSkeletalMuscle("");
    setBodyFat("");
    getBodyRecord(user.uid, selectedDateStr)
      .then((body) => {
        if (body) {
          setBodyWeight(body.weight?.toString() || "");
          setSkeletalMuscle(body.skeletal_muscle?.toString() || "");
          setBodyFat(body.body_fat?.toString() || "");
        }
      })
      .catch((err) => console.error("Body record fetch error:", err));
  }, [user, selectedDateStr]);

  useEffect(() => {
    if (!user) return;
    setMemos([]);
    getMemos(user.uid, selectedDateStr)
      .then(setMemos)
      .catch((err) => console.error("Memos fetch error:", err));
  }, [user, selectedDateStr]);

  const handleSaveBody = async () => {
    if (!user) return;
    setBodySaving(true);
    try {
      await saveBodyRecord({
        user_id: user.uid,
        date: selectedDateStr,
        weight: bodyWeight ? parseFloat(bodyWeight) : null,
        skeletal_muscle: skeletalMuscle ? parseFloat(skeletalMuscle) : null,
        body_fat: bodyFat ? parseFloat(bodyFat) : null,
      });
    } catch (err) {
      console.error("Body record save error:", err);
    } finally {
      setBodySaving(false);
    }
  };

  const handleAddMemo = async () => {
    if (!user || !memoContent.trim()) return;
    setMemoSaving(true);
    try {
      const newMemo = await addMemo({
        user_id: user.uid,
        date: selectedDateStr,
        content: memoContent.trim(),
        show_on_calendar: memoShowOnCalendar,
      });
      setMemos((prev) => [newMemo, ...prev]);
      setMemoContent("");
      setMemoShowOnCalendar(false);
      setMemoAddOpen(false);
    } catch (err) {
      console.error("Memo save error:", err);
    } finally {
      setMemoSaving(false);
    }
  };

  const handleExercisesSelected = async (selectedExercises: Exercise[]) => {
    if (!user || selectedExercises.length === 0) return;
    try {
      const workout = await addWorkout({
        user_id: user.uid,
        title: selectedExercises.map((e) => e.name).join(", "),
        performed_at: selectedDateStr,
        duration_minutes: null,
        notes: null,
      });
      const setsToCreate = selectedExercises.map((ex, idx) => ({
        workout_id: workout.id,
        exercise_id: ex.id,
        set_number: idx + 1,
        reps: null,
        weight: null,
        rest_seconds: null,
        completed: false,
      }));
      await addWorkoutSets(setsToCreate);
      const [w, s, e] = await Promise.all([
        getWorkouts(user.uid),
        getWorkoutSetsByUser(user.uid),
        getExercises(user.uid),
      ]);
      setWorkouts(w);
      setSets(s);
      setExercises(e);
    } catch (err) {
      console.error("Workout create error:", err);
    }
  };

  const handleToggleExerciseExpand = (exerciseId: string) => {
    setExpandedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseId)) next.delete(exerciseId);
      else next.add(exerciseId);
      return next;
    });
  };

  const handleDeleteExercise = async (exerciseId: string) => {
    if (!user) return;
    const wIds = dayWorkouts.map((w) => w.id);
    try {
      await deleteExerciseSetsFromWorkouts(wIds, exerciseId);
      setSets((prev) => prev.filter((s) => !(s.exercise_id === exerciseId && wIds.includes(s.workout_id))));
    } catch (err) {
      console.error("Delete exercise sets error:", err);
    }
  };

  const handleDeleteMemo = async (memoId: string) => {
    try {
      await deleteMemo(memoId);
      setMemos((prev) => prev.filter((m) => m.id !== memoId));
    } catch (err) {
      console.error("Memo delete error:", err);
    }
  };

  const handleOpenEditMemo = (memo: Memo) => {
    setEditingMemo(memo);
    setMemoContent(memo.content);
    setMemoShowOnCalendar(memo.show_on_calendar);
  };

  const handleUpdateMemo = async () => {
    if (!editingMemo || !memoContent.trim()) return;
    setMemoSaving(true);
    try {
      await updateMemo(editingMemo.id, {
        content: memoContent.trim(),
        show_on_calendar: memoShowOnCalendar,
      });
      setMemos((prev) =>
        prev.map((m) =>
          m.id === editingMemo.id
            ? { ...m, content: memoContent.trim(), show_on_calendar: memoShowOnCalendar }
            : m
        )
      );
      setEditingMemo(null);
      setMemoContent("");
      setMemoShowOnCalendar(false);
    } catch (err) {
      console.error("Memo update error:", err);
    } finally {
      setMemoSaving(false);
    }
  };

  useEffect(() => {
    if (!monthPickerOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(e.target as Node)) {
        setMonthPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [monthPickerOpen]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    if (deltaX > 0) {
      setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    } else {
      setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }
  }, []);

  const setsByWorkoutId = useMemo(() => {
    const map = new Map<string, WorkoutSet[]>();
    sets.forEach((s) => {
      const arr = map.get(s.workout_id) || [];
      arr.push(s);
      map.set(s.workout_id, arr);
    });
    return map;
  }, [sets]);

  const dayInfoMap = useMemo(() => {
    const map = new Map<string, DayInfo>();
    workouts.forEach((w) => {
      const d = new Date(w.performed_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const existing = map.get(key) || { duration: 0, setCount: 0, workoutCount: 0 };
      existing.duration += w.duration_minutes || 0;
      existing.workoutCount += 1;
      existing.setCount += (setsByWorkoutId.get(w.id) || []).length;
      map.set(key, existing);
    });
    return map;
  }, [workouts, setsByWorkoutId]);

  const getDayInfo = (date: Date): DayInfo | null => {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return dayInfoMap.get(key) || null;
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const weeks = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const getWeekNumber = (d: Date) => {
      const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
      const jan4 = new Date(target.getFullYear(), 0, 4);
      jan4.setDate(jan4.getDate() + 3 - ((jan4.getDay() + 6) % 7));
      const diff = target.getTime() - jan4.getTime();
      return 1 + Math.round(diff / 604800000);
    };
    const totalCells = startDow + daysInMonth;
    const rowCount = totalCells <= 35 ? 5 : 6;
    const calendarStart = new Date(year, month, 1 - startDow);
    const rows: WeekRow[] = [];
    for (let w = 0; w < rowCount; w++) {
      const days: DayCell[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(calendarStart.getFullYear(), calendarStart.getMonth(), calendarStart.getDate() + w * 7 + d);
        days.push({ date, isCurrentMonth: date.getMonth() === month && date.getFullYear() === year });
      }
      rows.push({ weekNumber: getWeekNumber(days[0].date), days });
    }
    return rows;
  }, [year, month]);

  const getWeekStats = (week: WeekRow) => {
    let duration = 0, setCount = 0;
    week.days.forEach((cell) => {
      const info = getDayInfo(cell.date);
      if (info) { duration += info.duration; setCount += info.setCount; }
    });
    return { duration, setCount };
  };

  const isTodayDate = (date: Date) =>
    date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const isSelected = (date: Date) => isSameDay(date, selectedDate);

  const handleDateClick = (date: Date) => {
    if (isSameDay(date, selectedDate)) {
      setDetailOpen(true);
      return;
    }
    setSelectedDate(date);
    setDetailOpen(false);
    if (date.getMonth() !== month || date.getFullYear() !== year) {
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  };

  const handleToggleDetail = () => setDetailOpen((prev) => !prev);

  const handleGoToToday = () => {
    const t = new Date();
    setSelectedDate(t);
    setCurrentMonth(new Date(t.getFullYear(), t.getMonth(), 1));
    setDetailOpen(true);
  };

  const selectedDayInfo = getDayInfo(selectedDate);

  const selectedDateWorkoutIndex = useMemo(() => {
    const sorted = [...workouts].sort(
      (a, b) => new Date(a.performed_at).getTime() - new Date(b.performed_at).getTime()
    );
    const dw = sorted.filter((w) => isSameDay(new Date(w.performed_at), selectedDate));
    if (dw.length === 0) return 0;
    return sorted.indexOf(dw[0]) + 1;
  }, [selectedDate, workouts]);

  const selectedWeekIdx = useMemo(() => {
    for (let w = 0; w < weeks.length; w++) {
      for (const cell of weeks[w].days) {
        if (isSameDay(cell.date, selectedDate)) return w;
      }
    }
    return -1;
  }, [selectedDate, weeks]);

  const getRowFlex = (wIdx: number) => {
    if (selectedWeekIdx < 0) return 1;
    const totalRows = weeks.length;
    const expandAmount = 0.25;
    if (wIdx === selectedWeekIdx) return 1 + expandAmount;
    return 1 - expandAmount / (totalRows - 1);
  };

  const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];

  const formatDuration = (mins: number) => {
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}h${m}m` : `${h}.0h`;
    }
    return `${mins}분`;
  };

  const exerciseMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  const dayWorkouts = useMemo(() => {
    return workouts.filter((w) => isSameDay(new Date(w.performed_at), selectedDate));
  }, [workouts, selectedDate]);

  const daySets = useMemo(() => {
    const wIds = new Set(dayWorkouts.map((w) => w.id));
    return sets.filter((s) => wIds.has(s.workout_id));
  }, [dayWorkouts, sets]);

  const groupedByExercise = useMemo(() => {
    return daySets.reduce((acc, s) => {
      if (!acc[s.exercise_id]) acc[s.exercise_id] = [];
      acc[s.exercise_id].push(s);
      return acc;
    }, {} as Record<string, WorkoutSet[]>);
  }, [daySets]);

  const totalSets = daySets.length;
  const totalVolume = useMemo(() => daySets.reduce((sum, s) => sum + (s.weight ? Number(s.weight) : 0) * (s.reps ?? 0), 0), [daySets]);
  const totalDuration = useMemo(() => dayWorkouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0), [dayWorkouts]);
  const isTodaySelected = isTodayDate(selectedDate);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (setEditExerciseId) {
    const editExercise = exerciseMap.get(setEditExerciseId);
    const editSets = daySets.filter((s) => s.exercise_id === setEditExerciseId);
    const editWorkoutId = dayWorkouts[0]?.id || "";
    return (
      <SetEditor
        exerciseId={setEditExerciseId}
        exercise={editExercise}
        sets={editSets}
        date={selectedDateStr}
        workoutId={editWorkoutId}
        onClose={() => setSetEditExerciseId(null)}
        onSetsChanged={(updatedSets) => {
          setSets((prev) => {
            const otherSets = prev.filter(
              (s) => !(s.exercise_id === setEditExerciseId && dayWorkouts.some((w) => w.id === s.workout_id))
            );
            return [...otherSets, ...updatedSets];
          });
        }}
      />
    );
  }

  if (memoAddOpen || editingMemo) {
    const isEditing = !!editingMemo;
    const handleClose = () => {
      setMemoAddOpen(false);
      setEditingMemo(null);
      setMemoContent("");
      setMemoShowOnCalendar(false);
    };
    return (
      <div className="flex flex-col h-[100dvh] bg-background">
        <div className="flex items-center gap-3 px-4 py-2.5 border-b shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleClose}
            data-testid="button-memo-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-bold">{isEditing ? "메모 수정" : "메모 추가"}</h1>
        </div>

        <div className="flex-1 flex flex-col px-4 py-4 overflow-hidden">
          <Textarea
            placeholder="메모를 입력하세요..."
            value={memoContent}
            onChange={(e) => setMemoContent(e.target.value)}
            className="flex-1 resize-none text-sm scrollbar-hide"
            style={{ maxHeight: "70vh" }}
            data-testid="textarea-memo"
          />
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t shrink-0 safe-area-bottom">
          <label className="flex items-center gap-2 cursor-pointer" data-testid="label-show-on-calendar">
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                memoShowOnCalendar ? "bg-primary border-primary" : "border-muted-foreground/40"
              }`}
              onClick={() => setMemoShowOnCalendar(!memoShowOnCalendar)}
            >
              {memoShowOnCalendar && <Check className="h-3 w-3 text-primary-foreground" />}
            </div>
            <span className="text-sm text-muted-foreground">캘린더에서 보기</span>
          </label>

          <Button
            size="sm"
            className="h-9 px-5"
            disabled={!memoContent.trim() || memoSaving}
            onClick={isEditing ? handleUpdateMemo : handleAddMemo}
            data-testid="button-memo-submit"
          >
            {memoSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? "수정" : "추가"}
          </Button>
        </div>
      </div>
    );
  }

  const detailHeader = (
    <div
      className={`flex items-center justify-between px-4 py-2 bg-background cursor-pointer shrink-0 ${detailOpen ? "safe-area-top" : ""}`}
      onClick={handleToggleDetail}
      data-testid="button-toggle-detail"
    >
      <div className="flex items-center gap-2.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={(e) => { e.stopPropagation(); handleToggleDetail(); }}
          data-testid="button-detail-toggle-icon"
        >
          {detailOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
        </Button>
        <div className="min-w-0">
          <p className="text-base font-bold leading-tight" data-testid="text-detail-date">
            {selectedDateStr}
            {isTodaySelected && <span className="text-xs text-primary font-semibold ml-1.5">오늘</span>}
          </p>
          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5" data-testid="text-workout-index">
            {selectedDayInfo
              ? `${selectedDateWorkoutIndex}번째 기록`
              : "기록 없음"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        {!isTodaySelected && (
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); handleGoToToday(); }}
            data-testid="button-go-today" title="오늘">
            <CalendarCheck className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7"
          data-testid="button-routine" title="루틴 (준비 중)"
          onClick={(e) => { e.stopPropagation(); alert("루틴 기능은 준비 중입니다."); }}>
          <Repeat className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const tabBar = (
    <div className="flex border-t shrink-0 bg-background safe-area-bottom" data-testid="detail-tab-bar">
      {([
        { key: "exercises" as DetailTab, label: "운동 목록" },
        { key: "body" as DetailTab, label: "신체정보" },
        { key: "memo" as DetailTab, label: "메모" },
      ]).map((tab) => (
        <button
          key={tab.key}
          className={`flex-1 py-2.5 text-xs font-medium text-center transition-colors ${
            activeTab === tab.key
              ? "text-primary border-t-2 border-primary -mt-px"
              : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab(tab.key)}
          data-testid={`tab-${tab.key}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  const exercisesTab = (
    <div className="flex-1 overflow-y-auto scrollbar-hide">
      <div className="px-4 py-4 space-y-4">
        {totalSets === 0 ? (
          <Card className="p-8 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-muted mx-auto">
              <Dumbbell className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold">운동을 추가해주세요</p>
              <p className="text-xs text-muted-foreground mt-1">아래 버튼을 눌러 운동을 기록하세요</p>
            </div>
            <Button className="gap-2" onClick={() => setExerciseSelectorOpen(true)} data-testid="button-add-workout-empty">
              <Plus className="h-4 w-4" /> 운동 추가
            </Button>
          </Card>
        ) : (
          <>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold" data-testid="text-section-title">운동 기록</h2>
                {totalDuration > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />{totalDuration}분
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1"><Dumbbell className="h-3 w-3" />{totalSets}세트</span>
                <span className="flex items-center gap-1">
                  <Weight className="h-3 w-3" />
                  {totalVolume > 0 ? (totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}t` : `${totalVolume.toLocaleString()}kg`) : "0kg"}
                </span>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 mb-3 h-7 text-xs"
                onClick={() => setExerciseSelectorOpen(true)} data-testid="button-add-more-workout">
                <Plus className="h-3.5 w-3.5" /> 운동 추가
              </Button>
            </div>
            <div className="space-y-3">
              {Object.entries(groupedByExercise).sort(([, aSets], [, bSets]) => {
                const aMin = Math.min(...aSets.map(s => new Date(s.created_at).getTime()));
                const bMin = Math.min(...bSets.map(s => new Date(s.created_at).getTime()));
                return aMin - bMin;
              }).map(([exerciseId, exSets]) => {
                const exercise = exerciseMap.get(exerciseId);
                const isExpanded = expandedExercises.has(exerciseId);
                return (
                  <Card key={exerciseId} className="overflow-hidden" data-testid={`card-exercise-${exerciseId}`}>
                    <div
                      className="flex items-center gap-3 px-3.5 py-2.5 cursor-pointer active:bg-muted/30 transition-colors"
                      onClick={() => setSetEditExerciseId(exerciseId)}
                      data-testid={`button-exercise-card-${exerciseId}`}
                    >
                      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 shrink-0">
                        <Dumbbell className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{exercise?.name || "알 수 없는 운동"}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {exercise?.muscle_group && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                              {MUSCLE_GROUP_LABELS[exercise.muscle_group as MuscleGroup] || exercise.muscle_group}
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">{exSets.length}세트</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-3.5 py-1.5 border-t border-muted/40">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1 text-muted-foreground"
                        onClick={(e) => { e.stopPropagation(); handleToggleExerciseExpand(exerciseId); }}
                        data-testid={`button-toggle-expand-${exerciseId}`}
                      >
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        {isExpanded ? "접기" : "펼치기"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDeleteExercise(exerciseId); }}
                        data-testid={`button-delete-exercise-${exerciseId}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        삭제
                      </Button>
                    </div>
                    {isExpanded && (
                      <div className="px-3.5 py-1.5 border-t border-muted/40 bg-muted/20">
                        <div className="grid grid-cols-3 gap-0 text-[10px] font-medium text-muted-foreground uppercase tracking-wider pb-1">
                          <span>세트</span><span>횟수 / 무게</span><span>휴식</span>
                        </div>
                        {exSets.map((s) => (
                          <div key={s.id} className="grid grid-cols-3 gap-0 text-sm py-1 border-t border-muted/30" data-testid={`row-set-${s.id}`}>
                            <span className="font-mono text-xs text-muted-foreground">{s.set_number}</span>
                            <span className="text-xs">
                              {s.reps ?? "-"}회 / {s.weight ? `${Number(s.weight)}kg` : "-"}
                            </span>
                            <span className="text-xs text-muted-foreground">{s.rest_seconds ? `${String(Math.floor(s.rest_seconds / 100)).padStart(2, "0")}:${String(s.rest_seconds % 100).padStart(2, "0")}` : "-"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );

  const bodyTab = (
    <div className="flex-1 overflow-y-auto scrollbar-hide">
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold" data-testid="text-body-section">신체정보</h2>
          <Button size="sm" className="h-8 px-4 text-xs gap-1.5" onClick={handleSaveBody} disabled={bodySaving} data-testid="button-save-body">
            {bodySaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            저장
          </Button>
        </div>
        <Card className="p-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground">체중 (kg)</label>
              <Input type="number" step="0.1" placeholder="-" value={bodyWeight} onChange={(e) => setBodyWeight(e.target.value)}
                className="h-9 text-sm text-center" data-testid="input-body-weight" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground">골격근량 (kg)</label>
              <Input type="number" step="0.1" placeholder="-" value={skeletalMuscle} onChange={(e) => setSkeletalMuscle(e.target.value)}
                className="h-9 text-sm text-center" data-testid="input-skeletal-muscle" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground">체지방 (%)</label>
              <Input type="number" step="0.1" placeholder="-" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)}
                className="h-9 text-sm text-center" data-testid="input-body-fat" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const memoTab = (
    <div className="flex-1 overflow-y-auto scrollbar-hide">
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold" data-testid="text-memo-section">메모</h2>
          <Button size="sm" variant="outline" className="h-8 px-4 text-xs gap-1.5"
            onClick={() => setMemoAddOpen(true)} data-testid="button-open-memo-add">
            <Plus className="h-3.5 w-3.5" /> 추가
          </Button>
        </div>
        {memos.length === 0 ? (
          <Card className="p-8 text-center space-y-2">
            <StickyNote className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">메모가 없습니다</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {memos.map((m) => (
              <Card
                key={m.id}
                className="p-3 cursor-pointer active:bg-muted/30 transition-colors"
                onClick={() => handleOpenEditMemo(m)}
                data-testid={`card-memo-${m.id}`}
              >
                <p className="text-sm whitespace-pre-wrap line-clamp-2">{m.content}</p>
                <div className="flex items-center gap-2 mt-2">
                  {m.show_on_calendar && (
                    <Badge variant="secondary" className="text-[9px] h-4 px-1.5">캘린더 표시</Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(m.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px] text-destructive hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); handleDeleteMemo(m.id); }}
                    data-testid={`button-delete-memo-${m.id}`}
                  >
                    삭제
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );


  return (
    <AppShell
      showHeader={!detailOpen}
      headerCenter={
        <div ref={monthPickerRef} className="relative">
          <button className="flex items-center gap-1.5 text-sm font-semibold px-2 py-1 rounded-md hover:bg-muted/50 transition-colors"
            onClick={() => setMonthPickerOpen(!monthPickerOpen)} data-testid="button-month-picker">
            {year}.{String(month + 1).padStart(2, "0")}
            <ChevronRight className={`h-3 w-3 text-muted-foreground transition-transform ${monthPickerOpen ? "rotate-90" : ""}`} />
          </button>
          {monthPickerOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-background border rounded-lg shadow-lg p-2 z-20 flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7"
                onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} data-testid="button-prev-month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium whitespace-nowrap min-w-[5.5rem] text-center">{year}년 {month + 1}월</span>
              <Button variant="ghost" size="icon" className="h-7 w-7"
                onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} data-testid="button-next-month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      }
      headerRight={
        <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-settings">
          <Settings className="h-5 w-5" />
        </Button>
      }
    >
    <div className="flex flex-col flex-1 overflow-hidden" data-testid="dashboard-calendar">
      <div
        ref={calendarRef}
        className="flex flex-col select-none overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          flex: detailOpen ? "0 0 0px" : "1 1 auto",
          opacity: detailOpen ? 0 : 1,
          transition: "flex 0.2s ease, opacity 0.15s ease",
          pointerEvents: detailOpen ? "none" : "auto",
        }}
      >
        <div className="grid grid-cols-[2.2rem_repeat(7,1fr)] text-center shrink-0 border-b">
          <div className="py-1.5" />
          {dayLabels.map((label, i) => (
            <div key={label} className={`py-1.5 text-[11px] font-medium ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-muted-foreground"}`}>
              {label}
            </div>
          ))}
        </div>
        <div className="flex-1 flex flex-col">
          {weeks.map((week, wIdx) => {
            const stats = getWeekStats(week);
            return (
              <div key={wIdx} className="grid grid-cols-[2.2rem_repeat(7,1fr)] border-b border-border/30"
                style={{ flex: getRowFlex(wIdx), minHeight: 0, transition: "flex 0.3s ease" }}>
                <div className="flex flex-col items-center justify-start pt-1.5 text-center border-r border-border/20">
                  <span className="text-[9px] font-semibold text-muted-foreground/80 leading-tight">{week.weekNumber}주</span>
                  {stats.duration > 0 && <span className="text-[8px] text-muted-foreground/60 leading-tight mt-0.5">{formatDuration(stats.duration)}</span>}
                  {stats.setCount > 0 && <span className="text-[8px] text-muted-foreground/60 leading-tight">{stats.setCount}s</span>}
                </div>
                {week.days.map((cell, dIdx) => {
                  const { date, isCurrentMonth } = cell;
                  const info = getDayInfo(date);
                  const todayDate = isTodayDate(date);
                  const sel = isSelected(date);
                  const isSunday = date.getDay() === 0;
                  const isSaturday = date.getDay() === 6;
                  return (
                    <button key={`${wIdx}-${dIdx}`}
                      className={`p-0.5 flex flex-col items-center transition-colors overflow-hidden ${sel ? "bg-primary/5" : ""} ${!isCurrentMonth ? "opacity-40" : ""}`}
                      onClick={() => handleDateClick(date)}
                      data-testid={`button-date-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                        todayDate ? "bg-primary text-primary-foreground"
                          : sel ? "bg-primary/20 text-primary"
                          : isSunday ? "text-red-400"
                          : isSaturday ? "text-blue-400"
                          : "text-foreground"}`}>
                        {date.getDate()}
                      </div>
                      {info && isCurrentMonth && (
                        <div className="w-full mt-0.5 space-y-px overflow-hidden">
                          {info.duration > 0 && (
                            <div className="bg-sky-100 dark:bg-sky-900/30 rounded-sm px-0.5 py-px">
                              <p className="text-[7px] text-sky-700 dark:text-sky-300 font-medium truncate text-center leading-tight">{info.duration}분</p>
                            </div>
                          )}
                          {info.setCount > 0 && (
                            <div className="bg-sky-50 dark:bg-sky-900/20 rounded-sm px-0.5 py-px">
                              <p className="text-[7px] text-sky-600 dark:text-sky-400 truncate text-center leading-tight">{info.setCount}세트</p>
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="bg-background flex flex-col"
        style={{
          flex: detailOpen ? "1 1 auto" : "0 0 auto",
          transition: "flex 0.2s ease",
          overflow: "hidden",
          borderTop: "none",
        }}
        data-testid="detail-panel"
      >
        {detailHeader}
        {detailOpen ? (
          <>
            {activeTab === "exercises" && exercisesTab}
            {activeTab === "body" && bodyTab}
            {activeTab === "memo" && memoTab}
            {tabBar}
          </>
        ) : null}
      </div>
    </div>
    <ExerciseSelector
      open={exerciseSelectorOpen}
      onClose={() => setExerciseSelectorOpen(false)}
      onSelect={handleExercisesSelected}
    />
    </AppShell>
  );
}
