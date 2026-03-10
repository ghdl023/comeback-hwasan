"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface WorkoutHistoryCalendarProps {
  open: boolean;
  onClose: () => void;
  workoutDates: Set<string>;
}

const DAY_HEADERS = ["일", "월", "화", "수", "목", "금", "토"];

function generateMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

export function WorkoutHistoryCalendar({
  open,
  onClose,
  workoutDates,
}: WorkoutHistoryCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const months = useMemo(() => {
    const result: { year: number; month: number; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const y = now.getFullYear();
      const m = now.getMonth() - i;
      const d = new Date(y, m, 1);
      result.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`,
      });
    }
    return result;
  }, []);

  const monthStats = useMemo(() => {
    const stats: Record<string, number> = {};
    months.forEach(({ year, month }) => {
      const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
      let count = 0;
      workoutDates.forEach((d) => {
        if (d.startsWith(prefix)) count++;
      });
      stats[`${year}-${month}`] = count;
    });
    return stats;
  }, [months, workoutDates]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" data-testid="workout-history-calendar">
      <div className="w-full max-w-md bg-background rounded-t-2xl flex flex-col" style={{ maxHeight: "85dvh" }}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b shrink-0">
          <h2 className="text-base font-semibold">운동 기록</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
            data-testid="button-close-history"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-6">
          {months.map(({ year, month, label }) => {
            const cells = generateMonthGrid(year, month);
            const workoutCount = monthStats[`${year}-${month}`] || 0;
            return (
              <div key={label}>
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-sm font-bold">{label}</span>
                  <span className="text-xs text-muted-foreground">
                    {workoutCount}일 운동
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-px">
                  {DAY_HEADERS.map((d, i) => (
                    <div
                      key={`h-${i}`}
                      className={`text-center text-[10px] font-medium pb-1 ${
                        i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-muted-foreground"
                      }`}
                    >
                      {d}
                    </div>
                  ))}

                  {cells.map((day, idx) => {
                    if (day === null) {
                      return <div key={`e-${idx}`} className="aspect-square" />;
                    }
                    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const hasWorkout = workoutDates.has(dateStr);
                    const isToday = dateStr === todayStr;
                    const dow = idx % 7;

                    return (
                      <div
                        key={dateStr}
                        className={`aspect-square flex items-center justify-center text-[11px] rounded-sm relative ${
                          hasWorkout
                            ? "bg-primary/20 text-primary font-semibold"
                            : ""
                        } ${
                          isToday
                            ? "ring-1 ring-primary font-bold"
                            : ""
                        } ${
                          dow === 0 && !hasWorkout ? "text-red-400/60" : ""
                        } ${
                          dow === 6 && !hasWorkout ? "text-blue-400/60" : ""
                        } ${
                          !hasWorkout && dow !== 0 && dow !== 6 ? "text-muted-foreground/50" : ""
                        }`}
                        data-testid={`history-day-${dateStr}`}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
