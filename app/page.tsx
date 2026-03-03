"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dumbbell, TrendingUp, Shield, Loader2 } from "lucide-react";
import { SiGoogle } from "react-icons/si";

export default function LandingPage() {
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

  if (user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="text-center max-w-2xl mx-auto space-y-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-4">
            <Dumbbell className="h-10 w-10 text-primary" />
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Your Personal
              <br />
              <span className="text-primary">Workout Tracker</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
              Log every rep, track your progress, and build the body you want.
              Simple, fast, and designed for lifters.
            </p>
          </div>

          <Button
            size="lg"
            onClick={signInWithGoogle}
            className="gap-3 text-base px-8 py-6"
            data-testid="button-google-login"
          >
            <SiGoogle className="h-5 w-5" />
            Continue with Google
          </Button>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 max-w-lg mx-auto">
            <div className="flex flex-col items-center gap-2 p-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent">
                <Dumbbell className="h-5 w-5 text-accent-foreground" />
              </div>
              <span className="text-sm font-medium">Track Workouts</span>
              <span className="text-xs text-muted-foreground text-center">
                Log sets, reps, and weights
              </span>
            </div>

            <div className="flex flex-col items-center gap-2 p-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent">
                <TrendingUp className="h-5 w-5 text-accent-foreground" />
              </div>
              <span className="text-sm font-medium">See Progress</span>
              <span className="text-xs text-muted-foreground text-center">
                View stats and trends
              </span>
            </div>

            <div className="flex flex-col items-center gap-2 p-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent">
                <Shield className="h-5 w-5 text-accent-foreground" />
              </div>
              <span className="text-sm font-medium">Private & Secure</span>
              <span className="text-xs text-muted-foreground text-center">
                Your data, only yours
              </span>
            </div>
          </div>
        </div>
      </div>

      <footer className="text-center py-6 text-sm text-muted-foreground border-t">
        FitLog &mdash; Built for lifters, by lifters.
      </footer>
    </div>
  );
}
