import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_DESCRIPTIONS, UpscaleCategory } from "@/lib/router";

const CATEGORIES: UpscaleCategory[] = ["portrait", "clarity", "product", "anime", "restoration"];

const PRICING = [
  {
    name: "Free",
    price: "$0",
    period: "",
    credits: "10 credits",
    description: "Try it out",
    features: ["10 free credits on signup", "All 5 upscale types", "4x upscaling"],
    cta: "Start Free",
    href: "/login",
    highlight: false,
  },
  {
    name: "Basic",
    price: "$9.99",
    period: "/mo",
    credits: "200 credits/month",
    description: "For regular use",
    features: ["200 credits/month", "All 5 upscale types", "4x upscaling", "Job history"],
    cta: "Get Basic",
    href: "/login",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$24.99",
    period: "/mo",
    credits: "600 credits/month",
    description: "For power users",
    features: ["600 credits/month", "All 5 upscale types", "4x upscaling", "Job history", "Priority processing"],
    cta: "Get Pro",
    href: "/login",
    highlight: true,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Nav */}
      <nav className="border-b border-zinc-100 dark:border-zinc-800">
        <div className="container mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="text-lg font-semibold">UpscaleAll</span>
          <Link href="/login">
            <Button size="sm">Start for Free</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="container mx-auto max-w-5xl px-4 py-20 text-center">
        <Badge variant="secondary" className="mb-4">10 free credits on signup · No card required</Badge>
        <h1 className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-6xl">
          Upscale Any Image<br />with AI
        </h1>
        <p className="mt-6 text-xl text-zinc-500 max-w-2xl mx-auto">
          4× quality boost for portraits, products, anime, and more.
          Smart routing picks the best AI provider for your image type — automatically.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/login">
            <Button size="lg" className="px-8">Upscale Your First Image →</Button>
          </Link>
        </div>
        <p className="mt-4 text-sm text-zinc-400">10 free credits · No credit card · Cancel anytime</p>
      </section>

      {/* Categories */}
      <section className="bg-zinc-50 dark:bg-zinc-900 py-20">
        <div className="container mx-auto max-w-5xl px-4">
          <h2 className="text-center text-3xl font-bold mb-4">5 Upscale Types</h2>
          <p className="text-center text-zinc-500 mb-12">Each type is routed to the best AI model for that content</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {CATEGORIES.map((cat) => (
              <div
                key={cat}
                className="flex flex-col items-center gap-3 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-6 text-center"
              >
                <span className="text-4xl">{CATEGORY_ICONS[cat]}</span>
                <span className="font-semibold text-sm">{CATEGORY_LABELS[cat]}</span>
                <span className="text-xs text-zinc-400 leading-snug">{CATEGORY_DESCRIPTIONS[cat]}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="container mx-auto max-w-5xl px-4">
          <h2 className="text-center text-3xl font-bold mb-12">How It Works</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { step: "1", title: "Upload", desc: "Drop your image (JPG, PNG, WEBP · max 10MB)" },
              { step: "2", title: "Choose Type", desc: "Pick the upscale category that matches your image" },
              { step: "3", title: "Download", desc: "Get your 4× upscaled image in seconds" },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex flex-col items-center text-center gap-3">
                <div className="h-12 w-12 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center text-xl font-bold">
                  {step}
                </div>
                <h3 className="font-semibold text-lg">{title}</h3>
                <p className="text-zinc-500 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-zinc-50 dark:bg-zinc-900 py-20">
        <div className="container mx-auto max-w-5xl px-4">
          <h2 className="text-center text-3xl font-bold mb-4">Simple Pricing</h2>
          <p className="text-center text-zinc-500 mb-12">1 upscale = 4 credits</p>
          <div className="grid gap-6 sm:grid-cols-3">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-8 flex flex-col gap-4 ${
                  plan.highlight
                    ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                    : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                }`}
              >
                <div>
                  <p className="font-semibold text-sm uppercase tracking-wide opacity-60">{plan.name}</p>
                  <p className="text-4xl font-bold mt-1">
                    {plan.price}<span className="text-lg font-normal opacity-60">{plan.period}</span>
                  </p>
                  <p className={`text-sm mt-1 ${plan.highlight ? "opacity-70" : "text-zinc-500"}`}>{plan.credits}</p>
                </div>
                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className={`text-sm flex items-center gap-2 ${plan.highlight ? "opacity-80" : "text-zinc-600 dark:text-zinc-300"}`}>
                      <span>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.href}>
                  <Button
                    className="w-full"
                    variant={plan.highlight ? "secondary" : "default"}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 dark:border-zinc-800 py-8">
        <div className="container mx-auto max-w-5xl px-4 flex items-center justify-between text-sm text-zinc-400">
          <span>© 2026 UpscaleAll</span>
          <Link href="/login" className="hover:text-zinc-600">Get Started →</Link>
        </div>
      </footer>
    </div>
  );
}
