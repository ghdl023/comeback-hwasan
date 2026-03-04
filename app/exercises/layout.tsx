import { AuthGuard } from "@/components/auth-guard";

export default function ExercisesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>{children}</AuthGuard>
  );
}
