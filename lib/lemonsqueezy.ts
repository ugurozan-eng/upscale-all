import { lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";

lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY! });

export const CREDIT_PACKAGES = {
  starter: {
    variantId: process.env.LS_VARIANT_STARTER!,
    credits: 40,
    label: "Starter — 40 Credits",
    price: "$4.99",
  },
  popular: {
    variantId: process.env.LS_VARIANT_POPULAR!,
    credits: 120,
    label: "Popular — 120 Credits",
    price: "$11.99",
  },
  pro: {
    variantId: process.env.LS_VARIANT_PRO!,
    credits: 400,
    label: "Pro Pack — 400 Credits",
    price: "$29.99",
  },
} as const;

export const SUBSCRIPTION_PLANS = {
  basic: {
    variantId: process.env.LS_VARIANT_BASIC_SUB!,
    monthlyCredits: 200,
    label: "Basic — 200 credits/month",
    price: "$9.99/mo",
  },
  pro: {
    variantId: process.env.LS_VARIANT_PRO_SUB!,
    monthlyCredits: 600,
    label: "Pro — 600 credits/month",
    price: "$24.99/mo",
  },
} as const;

export type CreditPackageKey = keyof typeof CREDIT_PACKAGES;
export type SubscriptionPlanKey = keyof typeof SUBSCRIPTION_PLANS;
