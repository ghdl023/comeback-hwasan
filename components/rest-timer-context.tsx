"use client";

import { createContext, useContext, useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import { updateWorkoutSet } from "@/lib/firebase/firestore";

export type TimerState =
  | { mode: "idle" }
  | { mode: "running"; setIdx: number; setDocId: string; totalSec: number; remainSec: number }
  | { mode: "next"; nextSetIdx: number };

export interface TimerTarget {
  exerciseId: string;
  exerciseName: string;
  workoutId: string;
  date: string;
}

interface RestTimerContextValue {
  timerState: TimerState;
  setTimerState: React.Dispatch<React.SetStateAction<TimerState>>;
  restingSetIdx: number | null;
  setRestingSetIdx: React.Dispatch<React.SetStateAction<number | null>>;
  timerTarget: TimerTarget | null;
  setTimerTarget: (target: TimerTarget | null) => void;
  startRestTimer: (setIdx: number, restMmss: number | null, setDocId?: string) => void;
  stopTimer: (currentSetIdx: number) => void;
  clearTimer: () => void;
  completeSetGlobal: (idx: number) => void;
  setOnCompleteSet: (fn: ((idx: number) => void) | undefined) => void;
  timerRef: React.MutableRefObject<NodeJS.Timeout | null>;
}

const RestTimerContext = createContext<RestTimerContextValue | null>(null);

function mmssToSeconds(v: number | null): number {
  if (v === null || v === 0) return 0;
  const m = Math.floor(v / 100);
  const s = v % 100;
  return m * 60 + s;
}

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [timerState, setTimerState] = useState<TimerState>({ mode: "idle" });
  const [restingSetIdx, setRestingSetIdx] = useState<number | null>(null);
  const [timerTarget, setTimerTarget] = useState<TimerTarget | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteSetRef = useRef<((idx: number) => void) | undefined>(undefined);
  const timerTargetRef = useRef<TimerTarget | null>(null);

  const setTimerTargetWrapped = useCallback((target: TimerTarget | null) => {
    timerTargetRef.current = target;
    setTimerTarget(target);
  }, []);

  const setOnCompleteSet = useCallback((fn: ((idx: number) => void) | undefined) => {
    onCompleteSetRef.current = fn;
  }, []);

  const completeSetGlobal = useCallback((idx: number) => {
    setRestingSetIdx(null);
    if (onCompleteSetRef.current) {
      onCompleteSetRef.current(idx);
    } else {
      setTimerState((prev) => {
        if (prev.mode === "running" && prev.setDocId) {
          updateWorkoutSet(prev.setDocId, { completed: true }).catch(console.error);
        }
        return prev;
      });
    }
  }, []);

  const startRestTimer = useCallback((setIdx: number, restMmss: number | null, setDocId?: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    const totalSec = mmssToSeconds(restMmss);
    setRestingSetIdx(setIdx);
    if (totalSec <= 0) {
      setTimerState({ mode: "idle" });
      return;
    }
    const docId = setDocId || "";
    setTimerState({ mode: "running", setIdx, setDocId: docId, totalSec, remainSec: totalSec });
    timerRef.current = setInterval(() => {
      setTimerState((prev) => {
        if (prev.mode !== "running") return prev;
        const next = prev.remainSec - 1;
        if (next <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          setTimeout(() => completeSetGlobal(prev.setIdx), 0);
          return { mode: "next", nextSetIdx: prev.setIdx + 1 };
        }
        return { ...prev, remainSec: next };
      });
    }, 1000);
  }, [completeSetGlobal]);

  const stopTimer = useCallback((currentSetIdx: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    completeSetGlobal(currentSetIdx);
    setTimerState({ mode: "next", nextSetIdx: currentSetIdx + 1 });
  }, [completeSetGlobal]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setTimerState({ mode: "idle" });
    setRestingSetIdx(null);
    setTimerTarget(null);
    timerTargetRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, []);

  return (
    <RestTimerContext.Provider
      value={{
        timerState,
        setTimerState,
        restingSetIdx,
        setRestingSetIdx,
        timerTarget,
        setTimerTarget: setTimerTargetWrapped,
        startRestTimer,
        stopTimer,
        clearTimer,
        completeSetGlobal,
        setOnCompleteSet,
        timerRef,
      }}
    >
      {children}
    </RestTimerContext.Provider>
  );
}

export function useRestTimer() {
  const ctx = useContext(RestTimerContext);
  if (!ctx) throw new Error("useRestTimer must be used within RestTimerProvider");
  return ctx;
}
