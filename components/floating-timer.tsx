"use client";

import { useRestTimer } from "@/components/rest-timer-context";

function secondsToDisplay(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m > 0) return `${m}:${String(s).padStart(2, "0")}`;
  return `${s}`;
}

interface FloatingTimerProps {
  onNavigate: () => void;
}

export function FloatingTimer({ onNavigate }: FloatingTimerProps) {
  const { timerState, timerTarget } = useRestTimer();

  if (timerState.mode !== "running" || !timerTarget) return null;

  const { totalSec, remainSec } = timerState;
  const progress = totalSec > 0 ? remainSec / totalSec : 0;
  const circumference = 2 * Math.PI * 28;
  const dashOffset = circumference * (1 - progress);

  return (
    <button
      onClick={onNavigate}
      className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      data-testid="button-floating-timer"
      style={{ padding: 0 }}
    >
      <svg
        className="absolute inset-0 w-full h-full -rotate-90"
        viewBox="0 0 64 64"
      >
        <circle
          cx="32"
          cy="32"
          r="28"
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="4"
        />
        <circle
          cx="32"
          cy="32"
          r="28"
          fill="none"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <span className="relative z-10 text-sm font-bold" data-testid="text-floating-timer-remain">
        {secondsToDisplay(remainSec)}
      </span>
    </button>
  );
}
