"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { X } from "lucide-react";

export function FloatingQuote() {
  const [quotes, setQuotes] = useState<string[]>([]);
  const [currentQuote, setCurrentQuote] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

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
    setFadeOut(true);
    setTimeout(() => {
      setVisible(false);
      setCurrentQuote(null);
      setFadeOut(false);
    }, 300);
  }, []);

  return (
    <>
      <button
        onClick={showRandomQuote}
        className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-transform"
        data-testid="button-floating-quote"
      >
        <Image
          src="/images/청명.png"
          alt="청명"
          width={40}
          height={40}
          className="rounded-full object-cover w-auto h-auto"
        />
      </button>

      {visible && currentQuote && (
        <div
          className={`fixed inset-0 z-[100] flex items-center justify-center px-6 transition-opacity duration-500 ${
            fadeOut ? "opacity-0" : "opacity-100"
          }`}
          onClick={handleClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className={`relative max-w-sm w-full bg-white/95 dark:bg-zinc-900/95 rounded-2xl shadow-2xl p-6 transition-all duration-500 ${
              fadeOut ? "scale-95 opacity-0" : "scale-100 opacity-100 animate-in fade-in zoom-in-95"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
              data-testid="button-close-quote"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="flex items-start gap-3 mb-3">
              <Image
                src="/images/청명.png"
                alt="청명"
                width={32}
                height={32}
                className="rounded-full object-cover shrink-0 mt-0.5 w-auto h-auto"
              />
              <span className="text-xs font-semibold text-primary">청명</span>
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
