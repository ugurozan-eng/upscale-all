import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/prisma";
import { BillingPanel } from "@/components/billing/billing-panel";

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      credits: true,
      subscription: true,
      transactions: {
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amount: true,
          type: true,
          createdAt: true,
          lsOrderId: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-sm text-zinc-500">Manage your credits and subscription.</p>
      </div>
      <BillingPanel
        credits={user?.credits ?? 0}
        subscription={user?.subscription ?? null}
        transactions={user?.transactions ?? []}
      />
    </div>
  );
}
