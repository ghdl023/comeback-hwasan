"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import { getCalendarSettings } from "@/lib/firebase/firestore";
import { getQuoteIconSrc } from "@/lib/types";

const ICON_SIZE = 64;
const AUTO_DISMISS_MS = 10000;
const BUBBLE_MAX_W = 240;

export function FloatingQuote() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [quotes, setQuotes] = useState<string[]>([]);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(30);
  const [iconSrc, setIconSrc] = useState<string>("/images/icon/cm/cm01.png");
  const [currentQuote, setCurrentQuote] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const [position, setPosition] = useState({ x: -1, y: -1 });

  useEffect(() => { setMounted(true); }, []);
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const hasDraggedRef = useRef(false);
  const btnRef = useRef<HTMLDivElement>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (position.x === -1 && position.y === -1) {
      const fallback = {
        x: window.innerWidth - 16 - ICON_SIZE,
        y: window.innerHeight - 80 - ICON_SIZE,
      };
      const tryFindToday = () => {
        const now = new Date();
        const testId = `button-date-${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
        const el = document.querySelector(`[data-testid="${testId}"]`);
        if (el) {
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2 - ICON_SIZE / 2;
          const cy = rect.top + rect.height / 2 - ICON_SIZE / 2;
          setPosition({
            x: Math.max(0, Math.min(cx, window.innerWidth - ICON_SIZE)),
            y: Math.max(0, Math.min(cy, window.innerHeight - ICON_SIZE)),
          });
        } else {
          setPosition(fallback);
        }
      };
      const timer = setTimeout(tryFindToday, 500);
      return () => clearTimeout(timer);
    }
  }, [position]);

  useEffect(() => {
    fetch("/data/quotes.json")
      .then((res) => res.json())
      .then((data) => setQuotes(data.quotes || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    getCalendarSettings(user.uid).then((s) => {
      setIntervalSeconds(s.quoteIntervalSeconds);
      setIconSrc(getQuoteIconSrc(s.quoteIconId));
    }).catch(() => {});
  }, [user?.uid]);

  useEffect(() => {
    const handleInterval = (e: Event) => {
      const val = (e as CustomEvent).detail;
      if (typeof val === "number") setIntervalSeconds(val);
    };
    const handleIcon = (e: Event) => {
      const val = (e as CustomEvent).detail;
      if (typeof val === "string") setIconSrc(getQuoteIconSrc(val));
    };
    window.addEventListener("quote-interval-changed", handleInterval);
    window.addEventListener("quote-icon-changed", handleIcon);
    return () => {
      window.removeEventListener("quote-interval-changed", handleInterval);
      window.removeEventListener("quote-icon-changed", handleIcon);
    };
  }, []);

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const dismissQuote = useCallback(() => {
    clearDismissTimer();
    setFadeOut(true);
    setTimeout(() => {
      setVisible(false);
      setCurrentQuote(null);
      setFadeOut(false);
    }, 400);
  }, [clearDismissTimer]);

  const showRandomQuote = useCallback(() => {
    if (quotes.length === 0) return;
    clearDismissTimer();
    const idx = Math.floor(Math.random() * quotes.length);
    setCurrentQuote(quotes[idx]);
    setVisible(true);
    setFadeOut(false);
    dismissTimerRef.current = setTimeout(() => {
      dismissQuote();
    }, AUTO_DISMISS_MS);
  }, [quotes, clearDismissTimer, dismissQuote]);

  useEffect(() => {
    if (quotes.length === 0 || !user || intervalSeconds <= 0) return;
    autoTimerRef.current = setInterval(() => {
      showRandomQuote();
    }, intervalSeconds * 1000);
    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    };
  }, [quotes, user, showRandomQuote, intervalSeconds]);

  const handleIconTap = useCallback(() => {
    if (visible) {
      dismissQuote();
    } else {
      showRandomQuote();
    }
  }, [visible, dismissQuote, showRandomQuote]);

  const clampPosition = useCallback((x: number, y: number) => {
    return {
      x: Math.max(0, Math.min(window.innerWidth - ICON_SIZE, x)),
      y: Math.max(0, Math.min(window.innerHeight - ICON_SIZE, y)),
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
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
    },
    [position],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
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
    },
    [clampPosition],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const wasDragging = draggingRef.current;
      draggingRef.current = false;
      if (wasDragging && !hasDraggedRef.current) {
        handleIconTap();
      }
    },
    [handleIconTap],
  );

  if (!mounted || !user || position.x === -1) return null;

  const bubbleLeft = Math.max(
    8,
    Math.min(position.x + ICON_SIZE / 2 - BUBBLE_MAX_W / 2, window.innerWidth - BUBBLE_MAX_W - 8)
  );
  const bubbleBottom = window.innerHeight - position.y + 8;
  const arrowLeft = position.x + ICON_SIZE / 2 - bubbleLeft;

  return (
    <>
      {visible && currentQuote && (
        <div
          className={`fixed z-[49] transition-opacity duration-400 ${fadeOut ? "opacity-0" : "opacity-100"}`}
          style={{
            left: bubbleLeft,
            bottom: bubbleBottom,
            maxWidth: BUBBLE_MAX_W,
            pointerEvents: "auto",
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            dismissQuote();
          }}
          data-testid="bubble-quote"
        >
          <div className="relative bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-gray-200 dark:border-zinc-700 px-3 py-2.5">
            <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 break-keep">
              &ldquo;{currentQuote}&rdquo;
            </p>
            <svg
              className="absolute"
              width="14"
              height="8"
              viewBox="0 0 14 8"
              style={{
                bottom: -8,
                left: Math.max(12, Math.min(arrowLeft - 7, BUBBLE_MAX_W - 26)),
              }}
            >
              <path d="M0 0 L7 8 L14 0" className="fill-gray-200 dark:fill-zinc-700" />
              <path d="M1 0 L7 6.5 L13 0" className="fill-white dark:fill-zinc-800" />
            </svg>
          </div>
        </div>
      )}

      <div
        ref={btnRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="fixed z-50 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none"
        style={{
          left: position.x,
          top: position.y,
          width: ICON_SIZE,
          height: ICON_SIZE,
          overflow: "hidden",
        }}
        data-testid="button-floating-quote"
      >
        <img
          src={iconSrc}
          alt="청명"
          width={ICON_SIZE}
          height={ICON_SIZE}
          className="w-full h-full object-cover pointer-events-none rounded-full"
          draggable={false}
        />
      </div>
    </>
  );
}
