"use client";

// TODO: 구글 로그인 인증 복구 후 로그인 체크 로직 복원
// import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function RootPage() {
  // const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 임시: 로그인 스킵, 바로 대시보드로 이동
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
