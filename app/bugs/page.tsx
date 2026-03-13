"use client";

import { useAuth } from "@/components/auth-provider";
import { getBugReports, addBugReport, updateBugReportStatus } from "@/lib/firebase/firestore";
import type { BugReport, BugReportStatus } from "@/lib/types";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Bug, ArrowLeft, X } from "lucide-react";

export default function BugsPage() {
  const { user, appUser } = useAuth();
  const router = useRouter();
  const isSuperAdmin = appUser?.role === "super_admin";

  const [items, setItems] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [detailItem, setDetailItem] = useState<BugReport | null>(null);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    const fetch = async () => {
      try {
        const data = await getBugReports(isSuperAdmin ? undefined : user.uid);
        setItems(data);
      } catch (err) {
        console.error("Bug reports fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user, isSuperAdmin, router]);

  const handleSubmit = async () => {
    if (!user || !content.trim()) return;
    setSaving(true);
    try {
      const item = await addBugReport({
        user_id: user.uid,
        user_email: user.email || "",
        content: content.trim(),
      });
      setItems((prev) => [item, ...prev]);
      setContent("");
      setModalOpen(false);
    } catch (err) {
      console.error("Bug report add error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: BugReportStatus) => {
    try {
      await updateBugReportStatus(id, status);
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
      if (detailItem?.id === id) setDetailItem((prev) => prev ? { ...prev, status } : null);
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  if (!user) return null;

  return (
    <AppShell>
      <div className="flex flex-col h-[100dvh] bg-background">
        <div className="flex items-center gap-3 px-4 py-2.5 border-b shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/dashboard")} data-testid="button-bugs-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-bold">버그 제보</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-hide">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Bug className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">등록된 버그 제보가 없습니다.</p>
            </div>
          ) : (
            items.map((item) => (
              <Card
                key={item.id}
                className="p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => isSuperAdmin && setDetailItem(item)}
                data-testid={`card-bug-${item.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm whitespace-pre-wrap line-clamp-3 flex-1">{item.content}</p>
                  <span
                    className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      item.status === "수정완료"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                    data-testid={`status-bug-${item.id}`}
                  >
                    {item.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {isSuperAdmin && (
                    <span className="text-[10px] text-muted-foreground">{item.user_email}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(item.created_at).toLocaleDateString("ko-KR")}
                  </span>
                </div>
              </Card>
            ))
          )}
        </div>

        <div className="px-4 py-3 border-t shrink-0 safe-area-bottom">
          <Button className="w-full h-10 text-sm gap-2" onClick={() => setModalOpen(true)} data-testid="button-open-bug-add">
            <Bug className="h-4 w-4" />
            {isSuperAdmin ? "버그 제보 추가" : "버그 제보"}
          </Button>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center" onClick={() => setModalOpen(false)}>
          <div className="bg-background rounded-xl p-5 mx-6 max-w-sm w-full shadow-lg" onClick={(e) => e.stopPropagation()} data-testid="modal-bug-add">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold">버그 제보</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-muted" data-testid="button-close-bug-modal">
                <X className="h-4 w-4" />
              </button>
            </div>
            <Textarea
              placeholder="발견하신 버그를 설명해주세요..."
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 1000))}
              className="min-h-[120px] resize-none text-sm scrollbar-hide"
              data-testid="textarea-bug"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-muted-foreground">{content.length}/1000</span>
              <Button size="sm" className="h-9 px-5" disabled={!content.trim() || saving} onClick={handleSubmit} data-testid="button-submit-bug">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "확인"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {detailItem && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center" onClick={() => setDetailItem(null)}>
          <div className="bg-background rounded-xl p-5 mx-6 max-w-sm w-full shadow-lg" onClick={(e) => e.stopPropagation()} data-testid="modal-bug-detail">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-bold">버그 제보 상세</h2>
              <button onClick={() => setDetailItem(null)} className="p-1 rounded hover:bg-muted" data-testid="button-close-bug-detail">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mb-3">
              {detailItem.user_email} · {new Date(detailItem.created_at).toLocaleString("ko-KR")}
            </p>
            <div className="bg-muted/30 rounded-lg p-3 mb-4">
              <p className="text-sm whitespace-pre-wrap">{detailItem.content}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground mr-auto">상태 변경:</span>
              {(["접수", "수정완료"] as BugReportStatus[]).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={detailItem.status === s ? "default" : "outline"}
                  className="h-8 text-xs"
                  onClick={() => handleStatusChange(detailItem.id, s)}
                  data-testid={`button-status-bug-${s}`}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
