"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

export function FloatingQuote() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<string[]>([]);
  const [currentQuote, setCurrentQuote] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const [position, setPosition] = useState({ x: -1, y: -1 });
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const hasDraggedRef = useRef(false);
  const btnRef = useRef<HTMLDivElement>(null);
  const justOpenedRef = useRef(false);
  const ICON_SIZE = 64;

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

  const showRandomQuote = useCallback(() => {
    if (quotes.length === 0) return;
    const idx = Math.floor(Math.random() * quotes.length);
    setCurrentQuote(quotes[idx]);
    setVisible(true);
    setFadeOut(false);
    justOpenedRef.current = true;
    setTimeout(() => {
      justOpenedRef.current = false;
    }, 300);
  }, [quotes]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => {
        setVisible(false);
        setCurrentQuote(null);
        setFadeOut(false);
      }, 500);
    }, 5000);
    return () => clearTimeout(timer);
  }, [visible, currentQuote]);

  const handleClose = useCallback(() => {
    if (justOpenedRef.current) return;
    setFadeOut(true);
    setTimeout(() => {
      setVisible(false);
      setCurrentQuote(null);
      setFadeOut(false);
    }, 300);
  }, []);

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
        showRandomQuote();
      }
    },
    [showRandomQuote],
  );

  if (!user || position.x === -1) return null;

  return (
    <>
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
        <Image
          src="/images/청명.png"
          alt="청명"
          width={ICON_SIZE}
          height={ICON_SIZE}
          className="w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
      </div>

      {visible && currentQuote && (
        <div
          className={`fixed inset-0 z-[100] flex items-center justify-center px-6 transition-opacity duration-500 ${
            fadeOut ? "opacity-0" : "opacity-100"
          }`}
          onPointerUp={(e) => {
            e.stopPropagation();
            handleClose();
          }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className={`relative max-w-sm w-full bg-white/95 dark:bg-zinc-900/95 rounded-2xl shadow-2xl p-6 transition-all duration-500 ${
              fadeOut ? "scale-95 opacity-0" : "scale-100 opacity-100 animate-in fade-in zoom-in-95"
            }`}
            onPointerUp={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
              data-testid="button-close-quote"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mt-0.5">
                <Image
                  src="/images/청명.png"
                  alt="청명"
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-xs font-semibold text-primary mt-2">청명</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 break-keep">
              &ldquo;{currentQuote}&rdquo;
            </p>
          </div>
        </div>
      )}
    </>
  );
}
