import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Header user={session.user} />
      <main className="container mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
