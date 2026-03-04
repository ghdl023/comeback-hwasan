"use client";

import { useAuth } from "@/components/auth-provider";
import { getWorkouts } from "@/lib/firebase/firestore";
import type { Workout } from "@/lib/types";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const w = await getWorkouts(user.uid).catch(() => [] as Workout[]);
        setWorkouts(w);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const workoutDateSet = useMemo(() => {
    const dateSet = new Set<string>();
    workouts.forEach((w) => {
      const d = new Date(w.performed_at);
      dateSet.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    return dateSet;
  }, [workouts]);

  const workoutDurationByDate = useMemo(() => {
    const map = new Map<string, number>();
    workouts.forEach((w) => {
      const d = new Date(w.performed_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      map.set(key, (map.get(key) || 0) + (w.duration_minutes || 0));
    });
    return map;
  }, [workouts]);

  const hasWorkout = useCallback(
    (date: Date) => {
      return workoutDateSet.has(
        `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      );
    },
    [workoutDateSet]
  );

  const goToPrevMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
  };

  const handleDateClick = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    const dayWorkouts = workouts.filter((w) => {
      const d = new Date(w.performed_at);
      return (
        d.getFullYear() === date.getFullYear() &&
        d.getMonth() === date.getMonth() &&
        d.getDate() === date.getDate()
      );
    });

    if (dayWorkouts.length === 1) {
      router.push(`/workouts/${dayWorkouts[0].id}`);
    } else if (dayWorkouts.length > 1) {
      router.push(`/workouts?date=${dateStr}`);
    } else {
      router.push(`/workouts/new?date=${dateStr}`);
    }
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const calendarDays: (Date | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(new Date(year, month, d));
  }

  const today = new Date();
  const isToday = (date: Date) =>
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const todayDuration = workoutDurationByDate.get(todayKey) || 0;

  const currentMonthWorkouts = workouts.filter((w) => {
    const d = new Date(w.performed_at);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const avgDuration =
    currentMonthWorkouts.length > 0
      ? currentMonthWorkouts.reduce(
          (sum, w) => sum + (w.duration_minutes || 0),
          0
        ) / currentMonthWorkouts.length
      : 0;

  const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg md:max-w-xl px-4 py-5 pb-20 md:pb-8" data-testid="dashboard-calendar">
      <div className="flex items-center justify-center gap-4 mb-5">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={goToPrevMonth}
          data-testid="button-prev-month"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold" data-testid="text-current-month">
          {year}년 {month + 1}월
        </h1>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={goToNextMonth}
          data-testid="button-next-month"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex items-start justify-between px-1 mb-5">
        <div>
          <p className="text-xs text-muted-foreground">오늘 (분)</p>
          <p className="text-3xl font-bold mt-0.5" data-testid="text-today-duration">
            {todayDuration || 0}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">평균 (분)</p>
          <p className="text-3xl font-bold text-primary mt-0.5" data-testid="text-avg-duration">
            {avgDuration > 0 ? avgDuration.toFixed(1) : "0"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {dayLabels.map((label, i) => (
          <div
            key={label}
            className={`text-center text-xs font-medium py-2 ${
              i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-muted-foreground"
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {calendarDays.map((date, idx) => {
          if (!date) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }

          const worked = hasWorkout(date);
          const todayDate = isToday(date);
          const dayOfWeek = date.getDay();
          const isSunday = dayOfWeek === 0;
          const isSaturday = dayOfWeek === 6;

          return (
            <button
              key={date.getDate()}
              className="aspect-square flex items-center justify-center relative"
              onClick={() => handleDateClick(date)}
              data-testid={`button-date-${date.getDate()}`}
            >
              {worked ? (
                <div
                  className={`w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    todayDate
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                      : "bg-primary/85 text-primary-foreground"
                  }`}
                >
                  {date.getDate()}
                </div>
              ) : (
                <div
                  className={`w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center text-sm transition-all ${
                    todayDate
                      ? "ring-2 ring-primary/40 font-bold text-primary"
                      : isSunday
                        ? "text-red-400"
                        : isSaturday
                          ? "text-blue-400"
                          : "text-foreground"
                  }`}
                >
                  {date.getDate()}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
