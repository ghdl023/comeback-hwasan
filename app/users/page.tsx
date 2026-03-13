"use client";

import { useAuth } from "@/components/auth-provider";
import { getAllUsers, updateUserActive } from "@/lib/firebase/firestore";
import type { AppUser } from "@/lib/types";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Loader2, Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UsersPage() {
  const { user, appUser } = useAuth();
  const router = useRouter();
  const isSuperAdmin = appUser?.role === "super_admin";

  useEffect(() => {
    if (!user) {
      router.replace("/login");
    } else if (appUser && !isSuperAdmin) {
      router.replace("/dashboard");
    }
  }, [user, appUser, isSuperAdmin, router]);

  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingUid, setTogglingUid] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isSuperAdmin) return;
    const fetch = async () => {
      try {
        const data = await getAllUsers();
        setUsers(data);
      } catch (err) {
        console.error("Users fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user, isSuperAdmin]);

  const handleToggleActive = useCallback(async (targetUid: string, currentActive: boolean) => {
    if (targetUid === user?.uid) return;
    setTogglingUid(targetUid);
    try {
      const newActive = !currentActive;
      await updateUserActive(targetUid, newActive);
      setUsers((prev) =>
        prev.map((u) => (u.uid === targetUid ? { ...u, is_active: newActive } : u))
      );
    } catch (err) {
      console.error("Toggle active error:", err);
    } finally {
      setTogglingUid(null);
    }
  }, [user]);

  if (!isSuperAdmin) return null;

  return (
    <AppShell
      headerLeft={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push("/dashboard")}
            data-testid="button-back-dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Users className="h-5 w-5 text-primary" />
          <span className="font-bold text-base">사용자 관리</span>
        </div>
      }
    >
      <div className="flex flex-col flex-1 overflow-auto p-4 space-y-3" data-testid="users-list">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-center text-muted-foreground py-20 text-sm">등록된 사용자가 없습니다.</p>
        ) : (
          users.map((u) => {
            const isSelf = u.uid === user?.uid;
            const isActive = u.is_active !== false;
            const toggling = togglingUid === u.uid;
            return (
              <Card key={u.uid} className="p-4" data-testid={`card-user-${u.uid}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" data-testid={`text-user-email-${u.uid}`}>
                      {u.email}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        u.role === "super_admin"
                          ? "bg-primary/10 text-primary font-medium"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {u.role === "super_admin" ? "슈퍼관리자" : "일반회원"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        가입: {new Date(u.created_at).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleActive(u.uid, isActive)}
                    disabled={isSelf || toggling}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isSelf ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    } ${isActive ? "bg-primary" : "bg-gray-300 dark:bg-zinc-600"}`}
                    data-testid={`toggle-active-${u.uid}`}
                    title={isSelf ? "자신의 계정은 변경할 수 없습니다" : isActive ? "비활성화" : "활성화"}
                  >
                    {toggling ? (
                      <span className="flex items-center justify-center w-full h-full">
                        <Loader2 className="h-3 w-3 animate-spin text-white" />
                      </span>
                    ) : (
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${
                          isActive ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    )}
                  </button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
