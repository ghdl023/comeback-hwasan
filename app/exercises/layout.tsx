import { Navbar } from "@/components/navbar";
import { AuthGuard } from "@/components/auth-guard";

export default function ExercisesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <AuthGuard>{children}</AuthGuard>
      </main>
    </div>
  );
}
