import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/prisma";
import { UpscalePanel } from "@/components/upscale/upscale-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { credits: true, name: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm text-zinc-500">
          You have <strong>{user?.credits ?? 0} credits</strong> · 4 credits per upscale
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upscale an Image</CardTitle>
        </CardHeader>
        <CardContent>
          <UpscalePanel initialCredits={user?.credits ?? 0} />
        </CardContent>
      </Card>
    </div>
  );
}
