"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CREDIT_PACKAGES, SUBSCRIPTION_PLANS } from "@/lib/lemonsqueezy";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  createdAt: Date;
  lsOrderId?: string | null;
}

interface Subscription {
  plan: string;
  status: string;
  currentPeriodEnd: Date;
  monthlyCredits: number;
}

interface BillingPanelProps {
  credits: number;
  subscription: Subscription | null;
  transactions: Transaction[];
}

export function BillingPanel({ credits, subscription, transactions }: BillingPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (type: "credits" | "subscription", plan: string) => {
    setLoading(`${type}-${plan}`);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>⚡</span> Credits
          </CardTitle>
          <CardDescription>1 upscale costs 4 credits</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{credits}</p>
          <p className="text-sm text-zinc-500 mt-1">
            ≈ {Math.floor(credits / 4)} upscales remaining
          </p>
        </CardContent>
      </Card>

      {/* Subscription Status */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={subscription.status === "active" ? "default" : "destructive"}>
                {subscription.status}
              </Badge>
              <span className="text-sm font-medium capitalize">{subscription.plan} Plan</span>
            </div>
            <p className="text-sm text-zinc-500">
              {subscription.monthlyCredits} credits/month · Renews{" "}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Credit Packages */}
      <Card>
        <CardHeader>
          <CardTitle>Buy Credits</CardTitle>
          <CardDescription>One-time purchase, never expires</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {Object.entries(CREDIT_PACKAGES).map(([key, pkg]) => (
              <div
                key={key}
                className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700"
              >
                <div>
                  <p className="font-semibold">{pkg.credits} Credits</p>
                  <p className="text-2xl font-bold mt-1">{pkg.price}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {(parseFloat(pkg.price.replace("$", "")) / pkg.credits * 100).toFixed(1)}¢ per credit
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleCheckout("credits", key)}
                  disabled={loading === `credits-${key}`}
                  className="w-full"
                >
                  {loading === `credits-${key}` ? "Loading..." : `Buy ${pkg.label.split("—")[0].trim()}`}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Subscription Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Plans</CardTitle>
          <CardDescription>Credits refresh every month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
              <div
                key={key}
                className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700"
              >
                <div>
                  <p className="font-semibold capitalize">{key} Plan</p>
                  <p className="text-2xl font-bold mt-1">{plan.price}</p>
                  <p className="text-sm text-zinc-500 mt-1">
                    {plan.monthlyCredits} credits/month
                  </p>
                  <p className="text-xs text-zinc-500">
                    ≈ {Math.floor(plan.monthlyCredits / 4)} upscales/month
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={subscription?.plan === key ? "outline" : "default"}
                  onClick={() => handleCheckout("subscription", key)}
                  disabled={loading === `subscription-${key}` || subscription?.plan === key}
                  className="w-full"
                >
                  {subscription?.plan === key
                    ? "Current Plan"
                    : loading === `subscription-${key}`
                    ? "Loading..."
                    : "Subscribe"}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {transactions.map((tx, i) => (
                <div key={tx.id}>
                  {i > 0 && <Separator className="my-2" />}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {tx.type.replace("_", " ")}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        tx.amount > 0 ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {tx.amount > 0 ? "+" : ""}{tx.amount} credits
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
