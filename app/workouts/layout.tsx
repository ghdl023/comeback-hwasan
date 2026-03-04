import { AuthGuard } from "@/components/auth-guard";

export default function WorkoutsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>{children}</AuthGuard>
  );
}
