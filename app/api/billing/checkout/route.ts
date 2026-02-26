import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { createCheckout } from "@lemonsqueezy/lemonsqueezy.js";
import { CREDIT_PACKAGES, SUBSCRIPTION_PLANS } from "@/lib/lemonsqueezy";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, plan } = await req.json();

  let variantId: string;

  if (type === "credits") {
    const pkg = CREDIT_PACKAGES[plan as keyof typeof CREDIT_PACKAGES];
    if (!pkg) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    variantId = pkg.variantId;
  } else if (type === "subscription") {
    const sub = SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS];
    if (!sub) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    variantId = sub.variantId;
  } else {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const checkout = await createCheckout(
    process.env.LEMONSQUEEZY_STORE_ID!,
    variantId,
    {
      checkoutData: {
        email: session.user.email ?? undefined,
        custom: { user_id: session.user.id },
      },
      productOptions: {
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
      },
    }
  );

  const checkoutUrl = checkout.data?.data.attributes.url;
  if (!checkoutUrl) {
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }

  return NextResponse.json({ url: checkoutUrl });
}
