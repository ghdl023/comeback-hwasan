"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dumbbell, Loader2 } from "lucide-react";
import { SiGoogle } from "react-icons/si";

function LoginContent() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

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
      <Card className="w-full max-w-sm p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mx-auto">
            <Dumbbell className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Welcome to FitLog</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to start tracking your workouts
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm text-center" data-testid="text-login-error">
            Login failed. Please try again.
          </div>
        )}

        <Button
          className="w-full gap-3"
          size="lg"
          onClick={signInWithGoogle}
          data-testid="button-google-login"
        >
          <SiGoogle className="h-4 w-4" />
          Continue with Google
        </Button>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
