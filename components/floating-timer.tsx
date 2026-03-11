"use client";

import { useState, useRef, useCallback } from "react";
import { useRestTimer } from "@/components/rest-timer-context";

const BUTTON_SIZE = 64;

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
  const [position, setPosition] = useState({ x: -1, y: -1 });
  const draggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const initializedRef = useRef(false);

  const clampPosition = useCallback((x: number, y: number) => {
    return {
      x: Math.max(0, Math.min(window.innerWidth - BUTTON_SIZE, x)),
      y: Math.max(0, Math.min(window.innerHeight - BUTTON_SIZE, y)),
    };
  }, []);

  if (timerState.mode !== "running" || !timerTarget) return null;

  if (!initializedRef.current || position.x === -1) {
    initializedRef.current = true;
    const defaultX = typeof window !== "undefined" ? window.innerWidth - BUTTON_SIZE - 24 : 0;
    const defaultY = typeof window !== "undefined" ? window.innerHeight - BUTTON_SIZE - 24 : 0;
    if (position.x === -1) {
      setPosition({ x: defaultX, y: defaultY });
      return null;
    }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current = true;
    hasDraggedRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    e.preventDefault();
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      hasDraggedRef.current = true;
    }
    const newPos = clampPosition(
      dragStartRef.current.posX + dx,
      dragStartRef.current.posY + dy,
    );
    setPosition(newPos);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const wasDragging = draggingRef.current;
    draggingRef.current = false;
    if (wasDragging && !hasDraggedRef.current) {
      onNavigate();
    }
  };

  const { totalSec, remainSec } = timerState;
  const progress = totalSec > 0 ? remainSec / totalSec : 0;
  const circumference = 2 * Math.PI * 28;
  const dashOffset = circumference * (1 - progress);

  return (
    <div
      className="fixed z-50 w-16 h-16 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing select-none touch-none"
      style={{
        left: position.x,
        top: position.y,
        pointerEvents: "auto",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      data-testid="button-floating-timer"
    >
      <svg
        className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
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
      <span className="relative z-10 text-sm font-bold pointer-events-none" data-testid="text-floating-timer-remain">
        {secondsToDisplay(remainSec)}
      </span>
    </div>
  );
}
