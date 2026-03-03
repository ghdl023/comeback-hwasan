"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { PlumBlossom } from "@/components/plum-blossom";
import {
  LayoutDashboard,
  Dumbbell,
  ListChecks,
  LogOut,
  Menu,
  X,
  Loader2,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/workouts", label: "운동기록", icon: Dumbbell },
  { href: "/exercises", label: "운동목록", icon: ListChecks },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user && !loading) return null;

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-14 items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-bold text-lg tracking-tight"
            data-testid="link-logo"
          >
            <PlumBlossom className="h-5 w-5 text-pink-500" />
            <span>화산귀환</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={active ? "secondary" : "ghost"}
                    size="sm"
                    data-testid={`link-nav-${item.href.slice(1)}`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : user ? (
              <>
                <span className="text-sm text-muted-foreground truncate max-w-[180px]" data-testid="text-user-email">
                  {user.email}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : null}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            data-testid="button-mobile-menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t bg-background px-4 py-3 space-y-2">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
              >
                <Button
                  variant={active ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  data-testid={`link-mobile-${item.href.slice(1)}`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
          {user && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground px-4 py-1 truncate" data-testid="text-mobile-email">
                {user.email}
              </p>
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive"
                onClick={signOut}
                data-testid="button-mobile-logout"
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </Button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
