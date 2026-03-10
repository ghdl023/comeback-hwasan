"use client";

import { useState, type ReactNode } from "react";
import { SidePanel } from "@/components/side-panel";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface AppShellProps {
  children: ReactNode;
  showHeader?: boolean;
  headerCenter?: ReactNode;
  headerRight?: ReactNode;
}

export function AppShell({ children, showHeader = true, headerCenter, headerRight }: AppShellProps) {
  const [sidePanelOpen, setSidePanelOpen] = useState(false);

  return (
    <div className="flex flex-col h-[100dvh]">
      <SidePanel open={sidePanelOpen} onClose={() => setSidePanelOpen(false)} />

      {showHeader && (
        <div className="flex items-center justify-between px-3 pt-8 pb-2.5 border-b bg-background shrink-0 safe-area-top">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setSidePanelOpen(true)}
            data-testid="button-side-nav"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1 flex items-center justify-center">
            {headerCenter}
          </div>

          <div className="shrink-0">
            {headerRight}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
