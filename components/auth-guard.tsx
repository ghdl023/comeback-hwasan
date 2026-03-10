"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: ReactNode }) {
  // TODO: 구글 로그인 인증 복구 후 아래 주석 해제
  // const { user, loading } = useAuth();
  // const router = useRouter();

  // useEffect(() => {
  //   if (!loading && !user) {
  //     router.replace("/login");
  //   }
  // }, [user, loading, router]);

  // if (loading) {
  //   return (
  //     <div className="flex items-center justify-center min-h-[60vh]">
  //       <Loader2 className="h-8 w-8 animate-spin text-primary" />
  //     </div>
  //   );
  // }

  // if (!user) {
  //   return (
  //     <div className="flex items-center justify-center min-h-[60vh]">
  //       <Loader2 className="h-8 w-8 animate-spin text-primary" />
  //     </div>
  //   );
  // }

  return <>{children}</>;
}
