import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db/prisma";
import { addCredits } from "@/lib/credits";
import { CREDIT_PACKAGES, SUBSCRIPTION_PLANS } from "@/lib/lemonsqueezy";

function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!;
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hmac, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get("x-signature") ?? "";

  if (!verifyWebhookSignature(payload, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventName: string = event.meta?.event_name ?? "";
  const userId: string = event.meta?.custom_data?.user_id ?? "";

  if (!userId) {
    return NextResponse.json({ error: "No user_id in custom data" }, { status: 400 });
  }

  try {
    switch (eventName) {
      case "order_created": {
        const variantId = String(
          event.data?.attributes?.first_order_item?.variant_id ?? ""
        );
        const lsOrderId = String(event.data?.id ?? "");

        // Idempotency: skip if already processed
        const existing = await db.creditTransaction.findFirst({
          where: { lsOrderId },
        });
        if (existing) break;

        const pkg = Object.values(CREDIT_PACKAGES).find(
          (p) => p.variantId === variantId
        );
        if (!pkg) break;

        await addCredits(userId, pkg.credits, "purchase", { lsOrderId });
        break;
      }

      case "subscription_created":
      case "subscription_resumed": {
        const lsSubId = String(event.data?.id ?? "");
        const variantId = String(
          event.data?.attributes?.variant_id ?? ""
        );
        const subEntry = Object.entries(SUBSCRIPTION_PLANS).find(
          ([, p]) => p.variantId === variantId
        );
        if (!subEntry) break;

        const [planKey, planData] = subEntry;
        const renewsAt: string =
          event.data?.attributes?.renews_at ?? new Date().toISOString();

        await db.subscription.upsert({
          where: { lsSubscriptionId: lsSubId },
          create: {
            userId,
            plan: planKey,
            status: "active",
            lsSubscriptionId: lsSubId,
            currentPeriodEnd: new Date(renewsAt),
            monthlyCredits: planData.monthlyCredits,
          },
          update: {
            status: "active",
            currentPeriodEnd: new Date(renewsAt),
          },
        });

        await addCredits(userId, planData.monthlyCredits, "subscription_renewal");
        break;
      }

      case "subscription_payment_success": {
        const lsSubId = String(
          event.data?.attributes?.subscription_id ?? ""
        );
        const subscription = await db.subscription.findUnique({
          where: { lsSubscriptionId: lsSubId },
        });
        if (!subscription) break;

        const renewsAt: string =
          event.data?.attributes?.renews_at ?? new Date().toISOString();

        await db.subscription.update({
          where: { lsSubscriptionId: lsSubId },
          data: {
            renewedAt: new Date(),
            currentPeriodEnd: new Date(renewsAt),
          },
        });

        await addCredits(
          subscription.userId,
          subscription.monthlyCredits,
          "subscription_renewal"
        );
        break;
      }

      case "subscription_cancelled":
      case "subscription_expired": {
        const lsSubId = String(event.data?.id ?? "");
        await db.subscription.updateMany({
          where: { lsSubscriptionId: lsSubId },
          data: { status: "cancelled" },
        });
        break;
      }

      default:
        // Unknown event — ignore silently
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
