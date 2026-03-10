"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { PlumBlossom } from "@/components/plum-blossom";

export default function LoginPage() {
  const { user, loading, signInWithEmail } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("이메일을 입력해주세요.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await signInWithEmail(email);
      router.replace("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("로그인에 실패했습니다.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-xs text-center space-y-8">
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="이메일 주소"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              className="text-center"
              autoComplete="email"
              data-testid="input-email"
            />
            {error && (
              <p className="text-xs text-red-500" data-testid="text-login-error">
                {error}
              </p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={submitting}
            data-testid="button-email-login"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "로그인"
            )}
          </Button>
        </form>

        {/* TODO: 구글 로그인 인증 복구 후 아래 버튼 활성화 */}
        {/* <Button
          className="w-full gap-3"
          size="lg"
          variant="outline"
          onClick={signInWithGoogle}
          data-testid="button-google-login"
        >
          <SiGoogle className="h-4 w-4" />
          Google로 로그인 / 회원가입
        </Button> */}

        <p className="text-[11px] text-muted-foreground">
          등록된 이메일 계정으로만 로그인 가능합니다.
        </p>
      </div>
    </div>
  );
}
