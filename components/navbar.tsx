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
  Loader2,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/workouts", label: "운동기록", icon: Dumbbell },
  { href: "/exercises", label: "운동목록", icon: ListChecks },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();

  if (!user && !loading) return null;

  return (
    <>
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-md" data-testid="navbar-top">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex h-14 items-center justify-between gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-bold text-lg tracking-tight"
              data-testid="link-logo"
            >
              <PlumBlossom className="h-5 w-5 text-pink-500" />
              <span className="hidden sm:inline">화산귀환</span>
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

            <div className="flex items-center gap-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : user ? (
                <>
                  <span className="text-sm text-muted-foreground truncate max-w-[120px] sm:max-w-[180px] hidden sm:inline" data-testid="text-user-email">
                    {user.displayName || user.email}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={signOut}
                    className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
                    data-testid="button-logout"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">로그아웃</span>
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </nav>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-md safe-area-bottom" data-testid="navbar-bottom">
        <div className="flex items-center justify-around h-14 max-w-md mx-auto">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition-colors ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
                data-testid={`link-bottom-${item.href.slice(1)}`}
              >
                <item.icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
