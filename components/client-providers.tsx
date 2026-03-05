"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import { RestTimerProvider } from "@/components/rest-timer-context";

export function ClientProviders({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <ThemeProvider>
      <AuthProvider>
        <RestTimerProvider>{children}</RestTimerProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
