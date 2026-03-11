"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface WorkoutHistoryCalendarProps {
  open: boolean;
  onClose: () => void;
  workoutDates: Set<string>;
  onSelectDate?: (dateStr: string) => void;
}

export function WorkoutHistoryCalendar({
  open,
  onClose,
  workoutDates,
  onSelectDate,
}: WorkoutHistoryCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const months = useMemo(() => {
    const result: { year: number; month: number; label: string; daysInMonth: number }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      result.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`,
        daysInMonth: last.getDate(),
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      data-testid="workout-history-calendar"
    >
      <div className="w-full max-w-md bg-background rounded-t-2xl flex flex-col" style={{ maxHeight: "85dvh" }}>
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b shrink-0">
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

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {months.map(({ year, month, label, daysInMonth }, monthIdx) => {
            const workoutCount = monthStats[`${year}-${month}`] || 0;
            const days: number[] = [];
            for (let d = daysInMonth; d >= 1; d--) days.push(d);

            return (
              <div
                key={label}
                className={monthIdx < months.length - 1 ? "border-b border-border/60" : ""}
              >
                <div className="flex gap-3 px-3 py-3">
                  <div className="shrink-0 w-[72px] pt-0.5">
                    <p className="text-xs font-bold leading-tight">{label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {workoutCount}일 운동
                    </p>
                  </div>

                  <div className="flex-1 flex flex-wrap gap-[3px] content-start">
                    {days.map((day) => {
                      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const hasWorkout = workoutDates.has(dateStr);
                      const isToday = dateStr === todayStr;
                      const isFuture = dateStr > todayStr;

                      return (
                        <button
                          key={dateStr}
                          type="button"
                          onClick={() => {
                            if (!isFuture && onSelectDate) {
                              onSelectDate(dateStr);
                            }
                          }}
                          className={`w-[26px] h-[26px] rounded-md flex items-center justify-center text-[12px] font-semibold leading-none cursor-pointer active:scale-95 transition-transform ${
                            isFuture
                              ? "bg-muted/30 text-muted-foreground/30 cursor-default"
                              : hasWorkout
                                ? "text-white"
                                : "bg-muted/60 text-muted-foreground/60"
                          } ${
                            isToday
                              ? "ring-2 ring-red-500 ring-offset-1 ring-offset-background"
                              : ""
                          }`}
                          style={hasWorkout && !isFuture ? {
                            backgroundImage: "url(/images/icon/maehwa.jpg)",
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          } : undefined}
                          data-testid={`history-day-${dateStr}`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
