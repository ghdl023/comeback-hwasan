"use client";

import { useAuth } from "@/components/auth-provider";
import { getWorkouts, getWorkoutSetsByUser } from "@/lib/firebase/firestore";
import type { Workout, WorkoutSet } from "@/lib/types";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import {
  Loader2,
  Settings,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

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

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const [w, s] = await Promise.all([
          getWorkouts(user.uid).catch(() => [] as Workout[]),
          getWorkoutSetsByUser(user.uid).catch(() => [] as WorkoutSet[]),
        ]);
        setWorkouts(w);
        setSets(s);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

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
      const startOfYear = new Date(d.getFullYear(), 0, 1);
      const diff = d.getTime() - startOfYear.getTime();
      const oneWeek = 604800000;
      return Math.ceil((diff / oneWeek + startOfYear.getDay() + 1) / 7);
    };

    const totalCells = startDow + daysInMonth;
    const rowCount = totalCells <= 35 ? 5 : 6;

    const calendarStart = new Date(year, month, 1 - startDow);

    const rows: WeekRow[] = [];
    for (let w = 0; w < rowCount; w++) {
      const days: DayCell[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(calendarStart.getFullYear(), calendarStart.getMonth(), calendarStart.getDate() + w * 7 + d);
        days.push({
          date,
          isCurrentMonth: date.getMonth() === month && date.getFullYear() === year,
        });
      }
      const sundayOfWeek = days[0].date;
      rows.push({ weekNumber: getWeekNumber(sundayOfWeek), days });
    }

    return rows;
  }, [year, month]);

  const getWeekStats = (week: WeekRow) => {
    let duration = 0;
    let setCount = 0;
    week.days.forEach((cell) => {
      const info = getDayInfo(cell.date);
      if (info) {
        duration += info.duration;
        setCount += info.setCount;
      }
    });
    return { duration, setCount };
  };

  const isToday = (date: Date) =>
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const isSelected = (date: Date) => isSameDay(date, selectedDate);

  const handleDateClick = (date: Date) => {
    if (isSameDay(date, selectedDate)) {
      handleGoToWorkout();
      return;
    }
    setSelectedDate(date);
    if (date.getMonth() !== month || date.getFullYear() !== year) {
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  };

  const handleGoToWorkout = () => {
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

    const dayWorkouts = workouts.filter((w) => {
      const d = new Date(w.performed_at);
      return isSameDay(d, selectedDate);
    });

    if (dayWorkouts.length === 1) {
      router.push(`/workouts/${dayWorkouts[0].id}`);
    } else if (dayWorkouts.length > 1) {
      router.push(`/workouts?date=${dateStr}`);
    } else {
      router.push(`/workouts/new?date=${dateStr}`);
    }
  };

  const selectedDayInfo = getDayInfo(selectedDate);
  const selectedDateWorkoutIndex = useMemo(() => {
    const sorted = [...workouts].sort(
      (a, b) => new Date(a.performed_at).getTime() - new Date(b.performed_at).getTime()
    );
    const dayWorkouts = sorted.filter((w) => isSameDay(new Date(w.performed_at), selectedDate));
    if (dayWorkouts.length === 0) return 0;
    return sorted.indexOf(dayWorkouts[0]) + 1;
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
    const shrinkEach = expandAmount / (totalRows - 1);
    return 1 - shrinkEach;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppShell
      headerCenter={
        <div ref={monthPickerRef} className="relative">
          <button
            className="flex items-center gap-1.5 text-sm font-semibold px-2 py-1 rounded-md hover:bg-muted/50 transition-colors"
            onClick={() => setMonthPickerOpen(!monthPickerOpen)}
            data-testid="button-month-picker"
          >
            {year}.{String(month + 1).padStart(2, "0")}
            <ChevronRight className={`h-3 w-3 text-muted-foreground transition-transform ${monthPickerOpen ? "rotate-90" : ""}`} />
          </button>

          {monthPickerOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-background border rounded-lg shadow-lg p-2 z-20 flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => { setCurrentMonth(new Date(year, month - 1, 1)); }}
                data-testid="button-prev-month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium whitespace-nowrap min-w-[5.5rem] text-center">
                {year}년 {month + 1}월
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => { setCurrentMonth(new Date(year, month + 1, 1)); }}
                data-testid="button-next-month"
              >
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
        className="flex-1 flex flex-col select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="grid grid-cols-[2.2rem_repeat(7,1fr)] text-center shrink-0 border-b">
          <div className="py-1.5" />
          {dayLabels.map((label, i) => (
            <div
              key={label}
              className={`py-1.5 text-[11px] font-medium ${
                i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-muted-foreground"
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="flex-1 flex flex-col">
          {weeks.map((week, wIdx) => {
            const stats = getWeekStats(week);

            return (
              <div
                key={wIdx}
                className="grid grid-cols-[2.2rem_repeat(7,1fr)] border-b border-border/30"
                style={{ flex: getRowFlex(wIdx), minHeight: 0, transition: "flex 0.3s ease" }}
              >
                <div className="flex flex-col items-center justify-start pt-1.5 text-center border-r border-border/20">
                  <span className="text-[9px] font-semibold text-muted-foreground/80 leading-tight">
                    {week.weekNumber}주
                  </span>
                  {stats.duration > 0 && (
                    <span className="text-[8px] text-muted-foreground/60 leading-tight mt-0.5">
                      {formatDuration(stats.duration)}
                    </span>
                  )}
                  {stats.setCount > 0 && (
                    <span className="text-[8px] text-muted-foreground/60 leading-tight">
                      {stats.setCount}s
                    </span>
                  )}
                </div>

                {week.days.map((cell, dIdx) => {
                  const { date, isCurrentMonth } = cell;
                  const info = getDayInfo(date);
                  const todayDate = isToday(date);
                  const sel = isSelected(date);
                  const isSunday = date.getDay() === 0;
                  const isSaturday = date.getDay() === 6;

                  return (
                    <button
                      key={`${wIdx}-${dIdx}`}
                      className={`p-0.5 flex flex-col items-center transition-colors overflow-hidden ${
                        sel ? "bg-primary/5" : ""
                      } ${!isCurrentMonth ? "opacity-40" : ""}`}
                      onClick={() => handleDateClick(date)}
                      data-testid={`button-date-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                          todayDate
                            ? "bg-primary text-primary-foreground"
                            : sel
                              ? "bg-primary/20 text-primary"
                              : isSunday
                                ? "text-red-400"
                                : isSaturday
                                  ? "text-blue-400"
                                  : "text-foreground"
                        }`}
                      >
                        {date.getDate()}
                      </div>
                      {info && isCurrentMonth && (
                        <div className="w-full mt-0.5 space-y-px overflow-hidden">
                          {info.duration > 0 && (
                            <div className="bg-sky-100 dark:bg-sky-900/30 rounded-sm px-0.5 py-px">
                              <p className="text-[7px] text-sky-700 dark:text-sky-300 font-medium truncate text-center leading-tight">
                                {info.duration}분
                              </p>
                            </div>
                          )}
                          {info.setCount > 0 && (
                            <div className="bg-sky-50 dark:bg-sky-900/20 rounded-sm px-0.5 py-px">
                              <p className="text-[7px] text-sky-600 dark:text-sky-400 truncate text-center leading-tight">
                                {info.setCount}세트
                              </p>
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

      <div className="border-t bg-background shrink-0 safe-area-bottom">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold" data-testid="text-selected-date">
                {selectedDate.getFullYear()}-{String(selectedDate.getMonth() + 1).padStart(2, "0")}-{String(selectedDate.getDate()).padStart(2, "0")}
              </p>
              {isToday(selectedDate) && (
                <span className="text-xs text-primary font-medium">오늘</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground" data-testid="text-workout-index">
              {selectedDayInfo
                ? `${selectedDateWorkoutIndex}번째 기록 · ${selectedDayInfo.workoutCount}회 운동`
                : "기록 없음"}
            </p>
          </div>

          <Button
            size="sm"
            variant="secondary"
            className="h-9 px-4 rounded-full text-xs font-medium shrink-0"
            onClick={handleGoToWorkout}
            data-testid="button-go-to-workout"
          >
            {selectedDayInfo ? "상세보기" : "운동기록"}
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
    </AppShell>
  );
}
