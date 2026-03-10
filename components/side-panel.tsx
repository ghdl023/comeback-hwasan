"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { PlumBlossom } from "@/components/plum-blossom";
import {
  Home,
  ListChecks,
  LogOut,
  X,
} from "lucide-react";

const baseMenuItems = [
  { href: "/dashboard", label: "홈", icon: Home },
];

const adminMenuItems = [
  { href: "/exercises", label: "운동 목록", icon: ListChecks },
];

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
}

export function SidePanel({ open, onClose }: SidePanelProps) {
  const pathname = usePathname();
  const { user, appUser, signOut } = useAuth();

  const isSuperAdmin = appUser?.role === "super_admin";
  const menuItems = isSuperAdmin ? [...baseMenuItems, ...adminMenuItems] : baseMenuItems;

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleSignOut = async () => {
    onClose();
    await signOut();
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-[60] transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        data-testid="side-panel-backdrop"
      />

      <div
        className={`fixed top-0 left-0 bottom-0 w-[70vw] max-w-[280px] bg-white dark:bg-zinc-900 z-[70] shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        data-testid="side-panel"
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <PlumBlossom className="h-5 w-5 text-pink-500" />
            <span className="font-bold text-sm">화산귀환</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            data-testid="button-close-panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-3">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" data-testid="text-panel-email">
            {user?.email || ""}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5" data-testid="text-panel-grade">
            {isSuperAdmin ? "슈퍼관리자" : "일반 회원"}
          </p>
        </div>

        <div className="mx-4 border-t border-gray-200 dark:border-zinc-700" />

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {menuItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
                }`}
                data-testid={`link-panel-${item.href.slice(1)}`}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}

          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors w-full"
            data-testid="button-panel-logout"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            로그아웃
          </button>
        </nav>
      </div>
    </>
  );
}
