"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { PlumBlossom } from "@/components/plum-blossom";

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-xs text-center space-y-10">
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-pink-100 dark:bg-pink-950/40 mx-auto">
            <PlumBlossom className="w-16 h-16 text-pink-500 dark:text-pink-400" />
          </div>
          <h1
            className="text-3xl font-bold tracking-tight"
            data-testid="text-login-title"
          >
            화산귀환
          </h1>
        </div>

        <Button
          className="w-full gap-3"
          size="lg"
          onClick={signInWithGoogle}
          data-testid="button-google-login"
        >
          <SiGoogle className="h-4 w-4" />
          Google로 로그인 / 회원가입
        </Button>
      </div>
    </div>
  );
}
