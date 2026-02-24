# UpscaleAll SaaS — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Multi-provider AI image upscaler SaaS with Google Auth, credit system, Lemon Squeezy payments, and smart provider routing across fal.ai / Claid.ai / Runware.ai.

**Architecture:** Next.js 16 App Router monolith — API routes handle upscale jobs async via polling. A routing layer selects the best AI provider per image category, with automatic fallback. Credits are deducted atomically after job completion (refunded on failure).

**Tech Stack:** Next.js 16 · TypeScript · shadcn/ui · Tailwind v4 · NextAuth v5 · Prisma · PostgreSQL · DO Spaces (S3) · fal.ai · Claid.ai · Runware.ai · Lemon Squeezy

---

## ⚠️ Pre-requisites Before Starting

Have these ready:
- PostgreSQL connection string (DigitalOcean Managed DB)
- Google OAuth credentials (console.cloud.google.com)
- DigitalOcean Spaces bucket + keys
- fal.ai API key (fal.ai/dashboard)
- (Phase 3 only) Claid.ai key, Runware.ai key, Lemon Squeezy account

---

# PHASE 1 — Foundation

> Goal: Working auth + upload + single-provider upscale (fal.ai Clarity)

---

## Task 1: Install Phase 1 Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install runtime dependencies**

```bash
cd "C:/Claude Projects/upscaleall/upscale-all"
npm install next-auth@5 @auth/prisma-adapter
npm install @prisma/client
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install @fal-ai/client
npm install sharp
```

**Step 2: Install dev dependencies**

```bash
npm install --save-dev prisma
npm install --save-dev jest ts-jest @types/jest jest-environment-node
npm install --save-dev @testing-library/react @testing-library/jest-dom
npm install --save-dev @types/node
```

**Step 3: Verify installs**

```bash
npx prisma --version
# Expected: prisma : 6.x.x
```

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install Phase 1 dependencies"
```

---

## Task 2: Environment Variables

**Files:**
- Create: `.env.local`
- Create: `.env.example`

**Step 1: Create `.env.local`**

```env
# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"

# NextAuth v5
AUTH_SECRET="run: npx auth secret"
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# DigitalOcean Spaces
DO_SPACES_KEY="your-spaces-key"
DO_SPACES_SECRET="your-spaces-secret"
DO_SPACES_ENDPOINT="https://nyc3.digitaloceanspaces.com"
DO_SPACES_BUCKET="upscaleall"
DO_SPACES_REGION="nyc3"
DO_SPACES_CDN_ENDPOINT="https://upscaleall.nyc3.cdn.digitaloceanspaces.com"

# AI Providers
FAL_KEY="your-fal-key"
CLAID_API_KEY="your-claid-key"
RUNWARE_API_KEY="your-runware-key"

# Lemon Squeezy (Phase 3)
LEMONSQUEEZY_API_KEY=""
LEMONSQUEEZY_WEBHOOK_SECRET=""
LEMONSQUEEZY_STORE_ID=""

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Step 2: Generate AUTH_SECRET**

```bash
npx auth secret
# Paste the output into .env.local AUTH_SECRET
```

**Step 3: Create `.env.example`** (same content but empty values — safe to commit)

**Step 4: Verify `.gitignore` has `.env.local`**

Check `.gitignore` — `.env.local` should already be listed. If not, add it.

**Step 5: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: add env example and verify gitignore"
```

---

## Task 3: Jest Configuration

**Files:**
- Create: `jest.config.ts`
- Create: `jest.setup.ts`

**Step 1: Create `jest.config.ts`**

```typescript
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterFramework: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }],
  },
};

export default config;
```

**Step 2: Create `jest.setup.ts`**

```typescript
// Global test setup
```

**Step 3: Add test script to `package.json`**

Open `package.json`, add to `scripts`:
```json
"test": "jest",
"test:watch": "jest --watch"
```

**Step 4: Run tests to verify setup**

```bash
npx jest
# Expected: "No tests found" — setup works
```

**Step 5: Commit**

```bash
git add jest.config.ts jest.setup.ts package.json
git commit -m "chore: configure jest with ts-jest"
```

---

## Task 4: Prisma Schema

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/db/prisma.ts`
- Create: `__tests__/lib/db.test.ts`

**Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
# This creates prisma/schema.prisma and updates .env
# Delete the .env file it creates — we use .env.local
```

**Step 2: Write `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  image     String?
  credits   Int      @default(10)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  accounts     Account[]
  sessions     Session[]
  subscription Subscription?
  jobs         UpscaleJob[]
  transactions CreditTransaction[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Subscription {
  id               String    @id @default(cuid())
  userId           String    @unique
  plan             String    // "basic" | "pro"
  status           String    // "active" | "cancelled" | "past_due"
  lsSubscriptionId String    @unique
  currentPeriodEnd DateTime
  monthlyCredits   Int
  renewedAt        DateTime?
  createdAt        DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model UpscaleJob {
  id          String    @id @default(cuid())
  userId      String
  category    String    // "portrait" | "clarity" | "product" | "anime" | "restoration"
  provider    String    // "claid" | "fal" | "runware"
  status      String    @default("pending") // "pending" | "processing" | "done" | "failed"
  inputUrl    String
  outputUrl   String?
  creditsUsed Int       @default(4)
  scale       Int       @default(4)
  errorMsg    String?
  createdAt   DateTime  @default(now())
  completedAt DateTime?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
}

model CreditTransaction {
  id        String   @id @default(cuid())
  userId    String
  amount    Int      // positive = add, negative = deduct
  type      String   // "purchase" | "subscription_renewal" | "usage" | "bonus" | "refund"
  lsOrderId String?
  jobId     String?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
}
```

**Step 3: Create `lib/db/prisma.ts`**

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

**Step 4: Run migration**

```bash
npx prisma db push
# Expected: "Your database is now in sync with your Prisma schema."
npx prisma generate
# Expected: "Generated Prisma Client"
```

**Step 5: Commit**

```bash
git add prisma/ lib/db/prisma.ts
git commit -m "feat: add Prisma schema with user, job, credit, subscription models"
```

---

## Task 5: NextAuth v5 Setup

**Files:**
- Create: `auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `middleware.ts`
- Create: `__tests__/auth.test.ts`

**Step 1: Create `auth.ts` (root level)**

```typescript
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [Google],
  session: { strategy: "database" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
```

**Step 2: Create `app/api/auth/[...nextauth]/route.ts`**

```typescript
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
```

**Step 3: Extend Next Auth types. Create `types/next-auth.d.ts`**

```typescript
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
```

**Step 4: Create `middleware.ts` (root level)**

```typescript
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard");
  const isOnLogin = req.nextUrl.pathname === "/login";

  if (isOnDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isOnLogin && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
```

**Step 5: Update `app/layout.tsx` — wrap with SessionProvider**

First install: `npm install next-auth@5` (already done in Task 1)

```typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UpscaleAll — AI Image Upscaler",
  description: "Upscale your images with AI. 4x quality, multiple styles.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
```

**Step 6: Create login page `app/login/page.tsx`**

```typescript
import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="flex flex-col items-center gap-6 rounded-2xl bg-white p-10 shadow-sm dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold tracking-tight">UpscaleAll</h1>
        <p className="text-sm text-zinc-500">AI Image Upscaling — Start for free</p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
        >
          <Button type="submit" className="w-full gap-2">
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>
        </form>
        <p className="text-xs text-zinc-400">10 free credits on signup. No card required.</p>
      </div>
    </div>
  );
}
```

**Step 7: Test auth route exists**

```bash
npm run dev
# Navigate to http://localhost:3000/login
# Expected: Login page with Google button renders
# Navigate to http://localhost:3000/dashboard
# Expected: Redirected to /login
```

**Step 8: Commit**

```bash
git add auth.ts middleware.ts app/ types/
git commit -m "feat: add NextAuth v5 with Google OAuth and route protection"
```

---

## Task 6: DO Spaces Storage Utility

**Files:**
- Create: `lib/storage.ts`
- Create: `__tests__/lib/storage.test.ts`

**Step 1: Write the failing test `__tests__/lib/storage.test.ts`**

```typescript
import { getStorageKey, getPublicUrl } from "@/lib/storage";

describe("storage utilities", () => {
  describe("getStorageKey", () => {
    it("builds correct input key", () => {
      const key = getStorageKey("user123", "abc.jpg", "input");
      expect(key).toBe("input/user123/abc.jpg");
    });

    it("builds correct output key", () => {
      const key = getStorageKey("user123", "abc.jpg", "output");
      expect(key).toBe("output/user123/abc.jpg");
    });
  });

  describe("getPublicUrl", () => {
    beforeEach(() => {
      process.env.DO_SPACES_CDN_ENDPOINT = "https://upscaleall.nyc3.cdn.digitaloceanspaces.com";
      process.env.DO_SPACES_BUCKET = "upscaleall";
    });

    it("returns CDN URL when CDN endpoint is set", () => {
      const url = getPublicUrl("input/user123/abc.jpg");
      expect(url).toBe(
        "https://upscaleall.nyc3.cdn.digitaloceanspaces.com/input/user123/abc.jpg"
      );
    });
  });
});
```

**Step 2: Run test — verify it fails**

```bash
npx jest __tests__/lib/storage.test.ts
# Expected: FAIL — "Cannot find module '@/lib/storage'"
```

**Step 3: Create `lib/storage.ts`**

```typescript
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export function getSpacesClient(): S3Client {
  return new S3Client({
    region: process.env.DO_SPACES_REGION!,
    endpoint: process.env.DO_SPACES_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.DO_SPACES_KEY!,
      secretAccessKey: process.env.DO_SPACES_SECRET!,
    },
  });
}

export function getStorageKey(
  userId: string,
  filename: string,
  type: "input" | "output"
): string {
  return `${type}/${userId}/${filename}`;
}

export function getPublicUrl(key: string): string {
  const cdnEndpoint = process.env.DO_SPACES_CDN_ENDPOINT;
  const bucket = process.env.DO_SPACES_BUCKET!;
  const endpoint = process.env.DO_SPACES_ENDPOINT!;

  if (cdnEndpoint) {
    return `${cdnEndpoint}/${key}`;
  }
  // Fallback to direct Spaces URL
  return `${endpoint}/${bucket}/${key}`;
}

export async function uploadToSpaces(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const client = getSpacesClient();
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.DO_SPACES_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: "public-read",
    })
  );
  return getPublicUrl(key);
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 300
): Promise<string> {
  const client = getSpacesClient();
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: process.env.DO_SPACES_BUCKET!,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn }
  );
}
```

**Step 4: Run tests — verify they pass**

```bash
npx jest __tests__/lib/storage.test.ts
# Expected: PASS (3 tests)
```

**Step 5: Commit**

```bash
git add lib/storage.ts __tests__/lib/storage.test.ts
git commit -m "feat: add DigitalOcean Spaces storage utility with tests"
```

---

## Task 7: Provider Router + fal.ai Adapter

**Files:**
- Create: `lib/providers/fal.ts`
- Create: `lib/router.ts`
- Create: `__tests__/lib/router.test.ts`

**Step 1: Write the failing router test**

```typescript
// __tests__/lib/router.test.ts
import { getProviderForCategory, ROUTING_TABLE } from "@/lib/router";

describe("provider router", () => {
  it("routes portrait to claid as primary", () => {
    const result = getProviderForCategory("portrait");
    expect(result.primary).toBe("claid");
    expect(result.fallback).toBe("fal");
  });

  it("routes clarity to fal as primary", () => {
    const result = getProviderForCategory("clarity");
    expect(result.primary).toBe("fal");
    expect(result.fallback).toBe("runware");
  });

  it("routes product to claid as primary", () => {
    const result = getProviderForCategory("product");
    expect(result.primary).toBe("claid");
  });

  it("routes anime to fal as primary", () => {
    const result = getProviderForCategory("anime");
    expect(result.primary).toBe("fal");
  });

  it("routes restoration to fal as primary", () => {
    const result = getProviderForCategory("restoration");
    expect(result.primary).toBe("fal");
  });

  it("every category has a primary and fallback", () => {
    const categories = Object.keys(ROUTING_TABLE);
    expect(categories).toHaveLength(5);
    categories.forEach((cat) => {
      const route = ROUTING_TABLE[cat as keyof typeof ROUTING_TABLE];
      expect(route.primary).toBeDefined();
      expect(route.fallback).toBeDefined();
    });
  });
});
```

**Step 2: Run test — verify fail**

```bash
npx jest __tests__/lib/router.test.ts
# Expected: FAIL
```

**Step 3: Create `lib/router.ts`**

```typescript
export type UpscaleCategory =
  | "portrait"
  | "clarity"
  | "product"
  | "anime"
  | "restoration";

export type ProviderName = "claid" | "fal" | "runware";

export interface RouteEntry {
  primary: ProviderName;
  fallback: ProviderName;
}

export const ROUTING_TABLE: Record<UpscaleCategory, RouteEntry> = {
  portrait:    { primary: "claid",   fallback: "fal"     },
  clarity:     { primary: "fal",     fallback: "runware" },
  product:     { primary: "claid",   fallback: "fal"     },
  anime:       { primary: "fal",     fallback: "runware" },
  restoration: { primary: "fal",     fallback: "runware" },
};

export function getProviderForCategory(category: UpscaleCategory): RouteEntry {
  return ROUTING_TABLE[category];
}

export const CATEGORY_LABELS: Record<UpscaleCategory, string> = {
  portrait:    "Portrait / Selfie",
  clarity:     "Clarity Upscaler",
  product:     "Product Photo",
  anime:       "Anime / Illustration",
  restoration: "Old Photo Restoration",
};

export const CATEGORY_DESCRIPTIONS: Record<UpscaleCategory, string> = {
  portrait:    "Best for faces and skin detail",
  clarity:     "General photos, landscapes, architecture",
  product:     "E-commerce and product shots",
  anime:       "Cartoons, anime, illustrations",
  restoration: "Damaged, old, or low-res photos",
};

export const CATEGORY_ICONS: Record<UpscaleCategory, string> = {
  portrait:    "😊",
  clarity:     "📸",
  product:     "🛍️",
  anime:       "🎨",
  restoration: "🕰️",
};
```

**Step 4: Run router tests — verify pass**

```bash
npx jest __tests__/lib/router.test.ts
# Expected: PASS (6 tests)
```

**Step 5: Create `lib/providers/fal.ts`**

```typescript
import * as fal from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_KEY });

// Model IDs per category
const FAL_MODELS: Record<string, string> = {
  clarity:     "fal-ai/aura-sr",
  anime:       "fal-ai/esrgan",
  restoration: "fal-ai/esrgan",
  product:     "fal-ai/aura-sr", // fallback for product
  portrait:    "fal-ai/aura-sr", // fallback for portrait
};

export interface FalUpscaleInput {
  imageUrl: string;
  category: string;
  scale: number; // 2 or 4
}

export interface FalUpscaleResult {
  outputUrl: string;
}

export async function upscaleWithFal(
  input: FalUpscaleInput
): Promise<FalUpscaleResult> {
  const model = FAL_MODELS[input.category] ?? "fal-ai/aura-sr";

  const result = await fal.subscribe(model, {
    input: {
      image_url: input.imageUrl,
      scale: input.scale,
      // upscaling_factor is used by aura-sr
      upscaling_factor: input.scale,
    },
    logs: false,
  });

  // fal.ai returns result.data.image.url or result.data.images[0].url
  const outputUrl =
    (result as any).data?.image?.url ??
    (result as any).data?.images?.[0]?.url;

  if (!outputUrl) {
    throw new Error("fal.ai returned no output URL");
  }

  return { outputUrl };
}
```

**Step 6: Run all tests**

```bash
npx jest
# Expected: All passing
```

**Step 7: Commit**

```bash
git add lib/router.ts lib/providers/fal.ts __tests__/lib/router.test.ts
git commit -m "feat: add provider router and fal.ai adapter"
```

---

## Task 8: Credits Utility

**Files:**
- Create: `lib/credits.ts`
- Create: `__tests__/lib/credits.test.ts`

**Step 1: Write failing test**

```typescript
// __tests__/lib/credits.test.ts
import { CREDITS_PER_UPSCALE, hasEnoughCredits } from "@/lib/credits";

describe("credits utility", () => {
  it("CREDITS_PER_UPSCALE is 4", () => {
    expect(CREDITS_PER_UPSCALE).toBe(4);
  });

  it("hasEnoughCredits returns true when user has enough", () => {
    expect(hasEnoughCredits(10)).toBe(true);
    expect(hasEnoughCredits(4)).toBe(true);
  });

  it("hasEnoughCredits returns false when user has too few", () => {
    expect(hasEnoughCredits(3)).toBe(false);
    expect(hasEnoughCredits(0)).toBe(false);
  });
});
```

**Step 2: Run test — verify fail**

```bash
npx jest __tests__/lib/credits.test.ts
# Expected: FAIL
```

**Step 3: Create `lib/credits.ts`**

```typescript
import { db } from "@/lib/db/prisma";

export const CREDITS_PER_UPSCALE = 4;

export function hasEnoughCredits(currentCredits: number): boolean {
  return currentCredits >= CREDITS_PER_UPSCALE;
}

export async function getUserCredits(userId: string): Promise<number> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  return user?.credits ?? 0;
}

/**
 * Atomically deduct credits. Returns new balance.
 * Throws if insufficient credits.
 */
export async function deductCredits(
  userId: string,
  amount: number,
  jobId: string
): Promise<number> {
  return db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!user || user.credits < amount) {
      throw new Error("Insufficient credits");
    }

    const updated = await tx.user.update({
      where: { id: userId },
      data: { credits: { decrement: amount } },
      select: { credits: true },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        amount: -amount,
        type: "usage",
        jobId,
      },
    });

    return updated.credits;
  });
}

/**
 * Add credits (purchase, refund, subscription renewal).
 */
export async function addCredits(
  userId: string,
  amount: number,
  type: "purchase" | "subscription_renewal" | "bonus" | "refund",
  options?: { lsOrderId?: string; jobId?: string }
): Promise<number> {
  return db.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
      select: { credits: true },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        amount,
        type,
        lsOrderId: options?.lsOrderId,
        jobId: options?.jobId,
      },
    });

    return updated.credits;
  });
}
```

**Step 4: Run tests — verify pass**

```bash
npx jest __tests__/lib/credits.test.ts
# Expected: PASS
```

**Step 5: Commit**

```bash
git add lib/credits.ts __tests__/lib/credits.test.ts
git commit -m "feat: add credits utility with atomic deduct/add and tests"
```

---

## Task 9: Upload API Route

**Files:**
- Create: `app/api/upload/route.ts`

**Step 1: Create `app/api/upload/route.ts`**

```typescript
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { uploadToSpaces, getStorageKey } from "@/lib/storage";
import { nanoid } from "nanoid";

// Install: npm install nanoid
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Use JPG, PNG, or WEBP." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 10MB." },
      { status: 400 }
    );
  }

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const filename = `${nanoid()}.${ext}`;
  const key = getStorageKey(session.user.id, filename, "input");

  const buffer = Buffer.from(await file.arrayBuffer());
  const publicUrl = await uploadToSpaces(key, buffer, file.type);

  return NextResponse.json({ url: publicUrl, key });
}
```

**Step 2: Install nanoid**

```bash
npm install nanoid
```

**Step 3: Test manually via dev server**

```bash
npm run dev
# Use curl or a REST client:
# POST http://localhost:3000/api/upload
# (Must be logged in — test after auth works)
```

**Step 4: Commit**

```bash
git add app/api/upload/route.ts
git commit -m "feat: add file upload API route with validation and DO Spaces"
```

---

## Task 10: Upscale API Routes

**Files:**
- Create: `app/api/upscale/route.ts` (POST — start job)
- Create: `app/api/upscale/[jobId]/route.ts` (GET — poll status)

**Step 1: Create `app/api/upscale/route.ts`**

```typescript
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/prisma";
import { getUserCredits, hasEnoughCredits, deductCredits } from "@/lib/credits";
import { getProviderForCategory, UpscaleCategory } from "@/lib/router";
import { upscaleWithFal } from "@/lib/providers/fal";
import { uploadToSpaces, getStorageKey } from "@/lib/storage";
import { nanoid } from "nanoid";

const VALID_CATEGORIES: UpscaleCategory[] = [
  "portrait", "clarity", "product", "anime", "restoration",
];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { inputUrl, category, scale = 4 } = body;

  // Validate inputs
  if (!inputUrl || typeof inputUrl !== "string") {
    return NextResponse.json({ error: "inputUrl is required" }, { status: 400 });
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  if (![2, 4].includes(scale)) {
    return NextResponse.json({ error: "Scale must be 2 or 4" }, { status: 400 });
  }

  // Check credits
  const credits = await getUserCredits(session.user.id);
  if (!hasEnoughCredits(credits)) {
    return NextResponse.json(
      { error: "Insufficient credits. Please purchase more." },
      { status: 402 }
    );
  }

  // Determine provider
  const route = getProviderForCategory(category as UpscaleCategory);
  const provider = route.primary; // Phase 2 will add fallback logic

  // Create job record
  const job = await db.upscaleJob.create({
    data: {
      userId: session.user.id,
      category,
      provider,
      status: "processing",
      inputUrl,
      scale,
      creditsUsed: 4,
    },
  });

  // Deduct credits immediately (refund on failure)
  await deductCredits(session.user.id, 4, job.id);

  // Process async (in the same request for Phase 1 simplicity)
  // Phase 2: move to background job queue
  processJob(job.id, session.user.id, inputUrl, category, scale, provider, route.fallback);

  return NextResponse.json({ jobId: job.id, status: "processing" });
}

async function processJob(
  jobId: string,
  userId: string,
  inputUrl: string,
  category: string,
  scale: number,
  provider: string,
  fallbackProvider: string
) {
  try {
    let outputUrl: string;

    if (provider === "fal" || provider === "claid" || provider === "runware") {
      // Phase 1: only fal.ai is implemented
      const result = await upscaleWithFal({ imageUrl: inputUrl, category, scale });

      // Download result and re-upload to our Spaces for persistence
      const response = await fetch(result.outputUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get("content-type") ?? "image/png";
      const ext = contentType.split("/")[1].replace("jpeg", "jpg");
      const key = getStorageKey(userId, `${nanoid()}.${ext}`, "output");
      outputUrl = await uploadToSpaces(key, buffer, contentType);
    } else {
      throw new Error(`Provider ${provider} not yet implemented`);
    }

    await db.upscaleJob.update({
      where: { id: jobId },
      data: { status: "done", outputUrl, completedAt: new Date() },
    });
  } catch (err) {
    console.error(`Job ${jobId} failed:`, err);

    await db.upscaleJob.update({
      where: { id: jobId },
      data: {
        status: "failed",
        errorMsg: err instanceof Error ? err.message : "Unknown error",
      },
    });

    // Refund credits on failure
    const { addCredits } = await import("@/lib/credits");
    await addCredits(userId, 4, "refund", { jobId });
  }
}
```

**Step 2: Create `app/api/upscale/[jobId]/route.ts`**

```typescript
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = await db.upscaleJob.findUnique({
    where: { id: params.jobId },
    select: {
      id: true,
      status: true,
      outputUrl: true,
      errorMsg: true,
      category: true,
      scale: true,
      createdAt: true,
      completedAt: true,
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Security: users can only see their own jobs
  const jobOwner = await db.upscaleJob.findFirst({
    where: { id: params.jobId, userId: session.user.id },
  });

  if (!jobOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(job);
}
```

**Step 3: Commit**

```bash
git add app/api/upscale/
git commit -m "feat: add upscale POST (start job) and GET (poll status) API routes"
```

---

## Task 11: Dashboard UI — Phase 1

**Files:**
- Create: `app/(dashboard)/layout.tsx`
- Create: `app/(dashboard)/page.tsx`
- Create: `components/upscale/upload-zone.tsx`
- Create: `components/upscale/category-selector.tsx`
- Create: `components/upscale/upscale-panel.tsx`
- Create: `components/layout/header.tsx`

**Step 1: Install additional shadcn components**

```bash
npx shadcn@latest add card badge progress separator
npx shadcn@latest add dropdown-menu avatar
```

**Step 2: Create `app/(dashboard)/layout.tsx`**

```typescript
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
```

**Step 3: Create `components/layout/header.tsx`**

```typescript
"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface HeaderProps {
  user: {
    id?: string | null;
    name?: string | null;
    image?: string | null;
    email?: string | null;
  };
  credits?: number;
}

export function Header({ user, credits = 0 }: HeaderProps) {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="container mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
          UpscaleAll
        </Link>

        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-1">
            <span className="text-xs">⚡</span>
            {credits} credits
          </Badge>
          <Link href="/dashboard/billing">
            <Button variant="outline" size="sm">Buy Credits</Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
```

**Step 4: Create `components/upscale/category-selector.tsx`**

```typescript
"use client";

import { UpscaleCategory, CATEGORY_LABELS, CATEGORY_DESCRIPTIONS, CATEGORY_ICONS } from "@/lib/router";
import { cn } from "@/lib/utils";

interface CategorySelectorProps {
  value: UpscaleCategory | null;
  onChange: (category: UpscaleCategory) => void;
}

const CATEGORIES: UpscaleCategory[] = [
  "portrait", "clarity", "product", "anime", "restoration",
];

export function CategorySelector({ value, onChange }: CategorySelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={cn(
            "flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all",
            value === cat
              ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
              : "border-zinc-200 bg-white hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800"
          )}
        >
          <span className="text-2xl">{CATEGORY_ICONS[cat]}</span>
          <span className="text-xs font-medium leading-tight">{CATEGORY_LABELS[cat]}</span>
        </button>
      ))}
    </div>
  );
}
```

**Step 5: Create `components/upscale/upload-zone.tsx`**

```typescript
"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onUpload: (url: string) => void;
  disabled?: boolean;
}

export function UploadZone({ onUpload, disabled }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please use JPG, PNG, or WEBP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Max 10MB.");
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpload(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }, [onUpload]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div>
      <label
        className={cn(
          "flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all",
          dragging
            ? "border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-800"
            : "border-zinc-300 bg-white hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800",
          disabled && "pointer-events-none opacity-50"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {preview ? (
          <img src={preview} alt="Preview" className="max-h-[200px] rounded-lg object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-zinc-400">
            <span className="text-4xl">📁</span>
            <span className="text-sm font-medium">
              {uploading ? "Uploading..." : "Drop image here or click to browse"}
            </span>
            <span className="text-xs">JPG, PNG, WEBP · Max 10MB</span>
          </div>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          disabled={disabled || uploading}
        />
      </label>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
```

**Step 6: Create `components/upscale/upscale-panel.tsx`**

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { UploadZone } from "./upload-zone";
import { CategorySelector } from "./category-selector";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { UpscaleCategory, CATEGORY_LABELS } from "@/lib/router";

type JobStatus = "idle" | "processing" | "done" | "failed";

export function UpscalePanel({ initialCredits }: { initialCredits: number }) {
  const [inputUrl, setInputUrl] = useState<string | null>(null);
  const [category, setCategory] = useState<UpscaleCategory | null>(null);
  const [scale, setScale] = useState<2 | 4>(4);
  const [status, setStatus] = useState<JobStatus>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState(initialCredits);

  const poll = useCallback(async (id: string) => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/upscale/${id}`);
      const data = await res.json();
      if (data.status === "done") {
        clearInterval(interval);
        setOutputUrl(data.outputUrl);
        setStatus("done");
        setCredits((c) => c - 4);
      } else if (data.status === "failed") {
        clearInterval(interval);
        setError(data.errorMsg ?? "Processing failed. Credits refunded.");
        setStatus("failed");
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleUpscale = async () => {
    if (!inputUrl || !category) return;
    setError(null);
    setStatus("processing");

    const res = await fetch("/api/upscale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputUrl, category, scale }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setStatus("failed");
      return;
    }

    setJobId(data.jobId);
    poll(data.jobId);
  };

  const canUpscale = !!inputUrl && !!category && status === "idle" && credits >= 4;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-zinc-500">1. Upload Image</h2>
        <UploadZone onUpload={setInputUrl} disabled={status === "processing"} />
      </div>

      {inputUrl && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-zinc-500">2. Choose Type</h2>
          <CategorySelector value={category} onChange={setCategory} />
        </div>
      )}

      {category && inputUrl && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-zinc-500">3. Scale</h2>
          <div className="flex gap-2">
            {([2, 4] as const).map((s) => (
              <Button
                key={s}
                variant={scale === s ? "default" : "outline"}
                size="sm"
                onClick={() => setScale(s)}
              >
                {s}x
              </Button>
            ))}
          </div>
        </div>
      )}

      {status === "processing" && (
        <div className="space-y-2">
          <p className="text-sm text-zinc-500">Processing with AI...</p>
          <Progress value={undefined} className="h-1 animate-pulse" />
        </div>
      )}

      {status === "done" && outputUrl && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-500">Result</h2>
          <img src={outputUrl} alt="Upscaled result" className="rounded-xl" />
          <a href={outputUrl} download>
            <Button className="w-full">⬇ Download</Button>
          </a>
          <Button variant="outline" className="w-full" onClick={() => {
            setStatus("idle"); setInputUrl(null); setCategory(null);
            setOutputUrl(null); setJobId(null);
          }}>
            Upscale Another
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {credits < 4 && status === "idle" && (
        <p className="text-sm text-amber-600">
          Not enough credits. <a href="/dashboard/billing" className="underline">Buy more →</a>
        </p>
      )}

      <Button
        onClick={handleUpscale}
        disabled={!canUpscale}
        className="w-full"
        size="lg"
      >
        Upscale{category ? ` (${CATEGORY_LABELS[category]})` : ""} — 4 Credits
      </Button>
    </div>
  );
}
```

**Step 7: Create `app/(dashboard)/page.tsx`**

```typescript
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
```

**Step 8: Test the full Phase 1 flow**

```bash
npm run dev
# 1. Go to http://localhost:3000 → see page (landing placeholder)
# 2. Go to /login → Google sign in
# 3. After login → redirect to /dashboard
# 4. Upload an image → uploads to DO Spaces
# 5. Select "Clarity" category
# 6. Click "Upscale" → polls API → shows result
```

**Step 9: Commit Phase 1**

```bash
git add app/ components/ lib/
git commit -m "feat: complete Phase 1 - auth, upload, fal.ai upscale, dashboard UI"
```

---

# PHASE 2 — Multi-Provider & Smart Routing

> Goal: All 5 categories working with correct providers and fallbacks

---

## Task 12: Claid.ai Adapter

**Files:**
- Create: `lib/providers/claid.ts`
- Create: `__tests__/lib/providers/claid.test.ts`

**Step 1: Write failing test**

```typescript
// __tests__/lib/providers/claid.test.ts
import { getClaidEndpoint } from "@/lib/providers/claid";

describe("Claid provider", () => {
  it("portrait category uses portrait endpoint", () => {
    expect(getClaidEndpoint("portrait")).toBe("/v1-beta1/image/upscale/portrait");
  });
  it("product category uses smart endpoint", () => {
    expect(getClaidEndpoint("product")).toBe("/v1-beta1/image/upscale/smart");
  });
});
```

**Step 2: Create `lib/providers/claid.ts`**

```typescript
const CLAID_BASE = "https://api.claid.ai";

const CLAID_ENDPOINTS: Record<string, string> = {
  portrait: "/v1-beta1/image/upscale/portrait",
  product:  "/v1-beta1/image/upscale/smart",
};

export function getClaidEndpoint(category: string): string {
  return CLAID_ENDPOINTS[category] ?? "/v1-beta1/image/upscale/smart";
}

export interface ClaidUpscaleInput {
  imageUrl: string;
  category: string;
  scale: number;
}

export async function upscaleWithClaid(
  input: ClaidUpscaleInput
): Promise<{ outputUrl: string }> {
  const endpoint = getClaidEndpoint(input.category);

  const res = await fetch(`${CLAID_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CLAID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: { image_url: input.imageUrl },
      output: {
        image: {
          format: { type: "jpeg", quality: 95 },
          upscale: { upscaling_factor: input.scale },
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claid API error: ${err}`);
  }

  const data = await res.json();
  const outputUrl = data?.data?.output?.tmp_url ?? data?.output?.url;

  if (!outputUrl) throw new Error("Claid returned no output URL");
  return { outputUrl };
}
```

**Step 3: Run tests and commit**

```bash
npx jest __tests__/lib/providers/claid.test.ts
git add lib/providers/claid.ts __tests__/lib/providers/claid.test.ts
git commit -m "feat: add Claid.ai provider adapter with tests"
```

---

## Task 13: Runware.ai Adapter

**Files:**
- Create: `lib/providers/runware.ts`

```typescript
import Runware from "@runware/sdk";

let runwareClient: Runware | null = null;

function getRunwareClient(): Runware {
  if (!runwareClient) {
    runwareClient = new Runware({ apiKey: process.env.RUNWARE_API_KEY! });
  }
  return runwareClient;
}

export async function upscaleWithRunware(input: {
  imageUrl: string;
  scale: number;
}): Promise<{ outputUrl: string }> {
  const client = getRunwareClient();
  await client.connect();

  const results = await client.imageUpscale({
    inputImage: input.imageUrl,
    upscaleFactor: input.scale,
    outputType: "URL",
  });

  const outputUrl = results?.[0]?.imageURL;
  if (!outputUrl) throw new Error("Runware returned no output URL");

  return { outputUrl };
}
```

Install: `npm install @runware/sdk`

```bash
git add lib/providers/runware.ts
git commit -m "feat: add Runware.ai provider adapter"
```

---

## Task 14: Wire Multi-Provider into Upscale API

**Files:**
- Modify: `app/api/upscale/route.ts` — replace `processJob` function

**Update the `processJob` function** to use all three providers with fallback:

```typescript
async function processJob(
  jobId: string,
  userId: string,
  inputUrl: string,
  category: string,
  scale: number,
  primaryProvider: string,
  fallbackProvider: string
) {
  const tryProvider = async (provider: string): Promise<string> => {
    switch (provider) {
      case "claid": {
        const { upscaleWithClaid } = await import("@/lib/providers/claid");
        const r = await upscaleWithClaid({ imageUrl: inputUrl, category, scale });
        return r.outputUrl;
      }
      case "fal": {
        const { upscaleWithFal } = await import("@/lib/providers/fal");
        const r = await upscaleWithFal({ imageUrl: inputUrl, category, scale });
        return r.outputUrl;
      }
      case "runware": {
        const { upscaleWithRunware } = await import("@/lib/providers/runware");
        const r = await upscaleWithRunware({ imageUrl: inputUrl, scale });
        return r.outputUrl;
      }
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  };

  try {
    let rawOutputUrl: string;
    try {
      rawOutputUrl = await tryProvider(primaryProvider);
    } catch (primaryErr) {
      console.warn(`Primary provider ${primaryProvider} failed, trying fallback ${fallbackProvider}:`, primaryErr);
      await db.upscaleJob.update({ where: { id: jobId }, data: { provider: fallbackProvider } });
      rawOutputUrl = await tryProvider(fallbackProvider);
    }

    // Re-upload to our Spaces
    const response = await fetch(rawOutputUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") ?? "image/png";
    const ext = contentType.split("/")[1].replace("jpeg", "jpg");
    const key = getStorageKey(userId, `${nanoid()}.${ext}`, "output");
    const outputUrl = await uploadToSpaces(key, buffer, contentType);

    await db.upscaleJob.update({
      where: { id: jobId },
      data: { status: "done", outputUrl, completedAt: new Date() },
    });
  } catch (err) {
    console.error(`Job ${jobId} failed:`, err);
    await db.upscaleJob.update({
      where: { id: jobId },
      data: { status: "failed", errorMsg: err instanceof Error ? err.message : "Unknown error" },
    });
    const { addCredits } = await import("@/lib/credits");
    await addCredits(userId, 4, "refund", { jobId });
  }
}
```

```bash
git add app/api/upscale/route.ts
git commit -m "feat: add multi-provider routing with automatic fallback"
```

---

## Task 15: Image Comparison Slider Component

**Files:**
- Create: `components/upscale/comparison-slider.tsx`

```typescript
"use client";

import { useRef, useState, useCallback } from "react";

interface ComparisonSliderProps {
  beforeUrl: string;
  afterUrl: string;
}

export function ComparisonSlider({ beforeUrl, afterUrl }: ComparisonSliderProps) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setPosition(pct);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative select-none overflow-hidden rounded-xl cursor-col-resize"
      onMouseMove={(e) => handleMove(e.clientX)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
    >
      <img src={afterUrl} alt="After" className="w-full" />
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img src={beforeUrl} alt="Before" className="w-full" />
      </div>
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white shadow flex items-center justify-center text-xs">
          ↔
        </div>
      </div>
      <div className="absolute top-2 left-2 rounded bg-black/50 px-2 py-1 text-xs text-white">Before</div>
      <div className="absolute top-2 right-2 rounded bg-black/50 px-2 py-1 text-xs text-white">After</div>
    </div>
  );
}
```

Update `upscale-panel.tsx` to use `ComparisonSlider` when job is done (replace the simple `<img>`).

```bash
git add components/upscale/comparison-slider.tsx components/upscale/upscale-panel.tsx
git commit -m "feat: add before/after comparison slider"
```

---

## Task 16: Job History Page

**Files:**
- Create: `app/(dashboard)/history/page.tsx`

```typescript
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/prisma";
import { CATEGORY_LABELS, CATEGORY_ICONS } from "@/lib/router";
import { Badge } from "@/components/ui/badge";

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const jobs = await db.upscaleJob.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">History</h1>
      {jobs.length === 0 && (
        <p className="text-zinc-500">No upscale jobs yet.</p>
      )}
      <div className="grid gap-4">
        {jobs.map((job) => (
          <div key={job.id} className="flex items-center gap-4 rounded-xl border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            {job.outputUrl && (
              <img src={job.outputUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
            )}
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span>{CATEGORY_ICONS[job.category as keyof typeof CATEGORY_ICONS]}</span>
                <span className="text-sm font-medium">{CATEGORY_LABELS[job.category as keyof typeof CATEGORY_LABELS]}</span>
                <Badge variant={job.status === "done" ? "default" : job.status === "failed" ? "destructive" : "secondary"}>
                  {job.status}
                </Badge>
              </div>
              <p className="text-xs text-zinc-400">{job.scale}x · {job.creditsUsed} credits · {new Date(job.createdAt).toLocaleDateString()}</p>
            </div>
            {job.outputUrl && (
              <a href={job.outputUrl} download>
                <button className="text-xs text-zinc-500 underline">Download</button>
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

```bash
git add app/(dashboard)/history/
git commit -m "feat: add job history page"
```

---

# PHASE 3 — Payments & Credits

> Goal: Lemon Squeezy integration — credit purchases, subscriptions, webhooks

---

## Task 17: Lemon Squeezy Setup

**Step 1: Install SDK**

```bash
npm install @lemonsqueezy/lemonsqueezy-js
```

**Step 2: Create `lib/lemonsqueezy.ts`**

```typescript
import { lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy-js";

lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY! });

// Credit package variant IDs (set in Lemon Squeezy dashboard)
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
```

Add variant IDs to `.env.local` and `.env.example`.

```bash
git add lib/lemonsqueezy.ts
git commit -m "feat: add Lemon Squeezy configuration"
```

---

## Task 18: Checkout API Route

**Files:**
- Create: `app/api/billing/checkout/route.ts`

```typescript
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { createCheckout } from "@lemonsqueezy/lemonsqueezy-js";
import { CREDIT_PACKAGES, SUBSCRIPTION_PLANS } from "@/lib/lemonsqueezy";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, plan } = await req.json();
  // type: "credits" | "subscription"
  // plan: "starter" | "popular" | "pro" | "basic"

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
```

```bash
git add app/api/billing/
git commit -m "feat: add Lemon Squeezy checkout API route"
```

---

## Task 19: Lemon Squeezy Webhook

**Files:**
- Create: `app/api/webhooks/lemon-squeezy/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db/prisma";
import { addCredits } from "@/lib/credits";
import { CREDIT_PACKAGES, SUBSCRIPTION_PLANS } from "@/lib/lemonsqueezy";

function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!;
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
}

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get("x-signature") ?? "";

  if (!verifyWebhookSignature(payload, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(payload);
  const eventName = event.meta?.event_name;
  const userId = event.meta?.custom_data?.user_id;

  if (!userId) {
    return NextResponse.json({ error: "No user_id in custom data" }, { status: 400 });
  }

  switch (eventName) {
    case "order_created": {
      // One-time credit purchase
      const variantId = String(event.data?.attributes?.first_order_item?.variant_id);
      const lsOrderId = String(event.data?.id);

      // Idempotency: check if already processed
      const existing = await db.creditTransaction.findFirst({
        where: { lsOrderId },
      });
      if (existing) break;

      const pkg = Object.values(CREDIT_PACKAGES).find((p) => p.variantId === variantId);
      if (!pkg) break;

      await addCredits(userId, pkg.credits, "purchase", { lsOrderId });
      break;
    }

    case "subscription_created":
    case "subscription_resumed": {
      const lsSubId = String(event.data?.id);
      const variantId = String(event.data?.attributes?.variant_id);
      const sub = Object.entries(SUBSCRIPTION_PLANS).find(
        ([, p]) => p.variantId === variantId
      );
      if (!sub) break;

      const [planKey, planData] = sub;
      const renewsAt = event.data?.attributes?.renews_at;

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

      // Add first month credits
      await addCredits(userId, planData.monthlyCredits, "subscription_renewal");
      break;
    }

    case "subscription_payment_success": {
      // Monthly renewal
      const lsSubId = String(event.data?.attributes?.subscription_id);
      const subscription = await db.subscription.findUnique({
        where: { lsSubscriptionId: lsSubId },
      });
      if (!subscription) break;

      const renewsAt = event.data?.attributes?.renews_at;
      await db.subscription.update({
        where: { lsSubscriptionId: lsSubId },
        data: { renewedAt: new Date(), currentPeriodEnd: new Date(renewsAt) },
      });

      await addCredits(subscription.userId, subscription.monthlyCredits, "subscription_renewal");
      break;
    }

    case "subscription_cancelled":
    case "subscription_expired": {
      const lsSubId = String(event.data?.id);
      await db.subscription.updateMany({
        where: { lsSubscriptionId: lsSubId },
        data: { status: "cancelled" },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
```

```bash
git add app/api/webhooks/
git commit -m "feat: add Lemon Squeezy webhook with credit handling and idempotency"
```

---

## Task 20: Billing Page

**Files:**
- Create: `app/(dashboard)/billing/page.tsx`

```typescript
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
      transactions: { take: 10, orderBy: { createdAt: "desc" } },
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Billing</h1>
      <BillingPanel
        credits={user?.credits ?? 0}
        subscription={user?.subscription ?? null}
        transactions={user?.transactions ?? []}
      />
    </div>
  );
}
```

Create `components/billing/billing-panel.tsx` — client component with:
- Current credits display
- Subscription status
- Credit package purchase buttons (POST to `/api/billing/checkout`, redirect to URL)
- Subscription plan buttons
- Transaction history table

```bash
git add app/(dashboard)/billing/ components/billing/
git commit -m "feat: add billing page with credit packages and subscription plans"
```

---

# PHASE 4 — Polish & Deploy

---

## Task 21: Landing Page

**Files:**
- Modify: `app/page.tsx`

Build landing page with:
- Hero: "Upscale Your Photos with AI"
- Before/After comparison slider (with static demo images)
- 5 category cards
- Pricing table
- "Start for Free" CTA → `/login`

```bash
git add app/page.tsx public/
git commit -m "feat: add landing page with hero, demo, and pricing"
```

---

## Task 22: Error Boundary + Toast Notifications

**Step 1: Add shadcn Toaster**

```bash
npx shadcn@latest add toast sonner
```

**Step 2: Add `<Toaster />` to `app/layout.tsx`**

**Step 3: Update `upscale-panel.tsx`** to use `toast()` for errors and success instead of inline error text.

```bash
git add app/layout.tsx components/
git commit -m "feat: add toast notifications for upscale status"
```

---

## Task 23: DigitalOcean App Platform Deploy

**Files:**
- Create: `.do/app.yaml`

```yaml
name: upscaleall
region: nyc
services:
  - name: web
    source_dir: /
    github:
      repo: YOUR_GITHUB_REPO
      branch: main
      deploy_on_push: true
    build_command: npm run build
    run_command: npm start
    environment_slug: node-js
    instance_size_slug: apps-s-1vcpu-0.5gb
    envs:
      - key: DATABASE_URL
        scope: RUN_TIME
        type: SECRET
      - key: AUTH_SECRET
        scope: RUN_TIME
        type: SECRET
      - key: AUTH_GOOGLE_ID
        scope: RUN_TIME
        type: SECRET
      - key: AUTH_GOOGLE_SECRET
        scope: RUN_TIME
        type: SECRET
      - key: DO_SPACES_KEY
        scope: RUN_TIME
        type: SECRET
      - key: DO_SPACES_SECRET
        scope: RUN_TIME
        type: SECRET
      - key: DO_SPACES_ENDPOINT
        scope: RUN_TIME
      - key: DO_SPACES_BUCKET
        scope: RUN_TIME
      - key: DO_SPACES_REGION
        scope: RUN_TIME
      - key: DO_SPACES_CDN_ENDPOINT
        scope: RUN_TIME
      - key: FAL_KEY
        scope: RUN_TIME
        type: SECRET
      - key: CLAID_API_KEY
        scope: RUN_TIME
        type: SECRET
      - key: RUNWARE_API_KEY
        scope: RUN_TIME
        type: SECRET
      - key: LEMONSQUEEZY_API_KEY
        scope: RUN_TIME
        type: SECRET
      - key: LEMONSQUEEZY_WEBHOOK_SECRET
        scope: RUN_TIME
        type: SECRET
      - key: LEMONSQUEEZY_STORE_ID
        scope: RUN_TIME
      - key: NEXT_PUBLIC_APP_URL
        scope: RUN_AND_BUILD_TIME
        value: "https://your-domain.com"
```

**Step 2: Push to GitHub**

```bash
git remote add origin https://github.com/YOUR_USERNAME/upscaleall.git
git push -u origin master
```

**Step 3: Create DO App from dashboard**
- Go to DigitalOcean → App Platform → New App
- Connect GitHub repo
- Set all env vars from `.env.local`
- Set `NEXT_PUBLIC_APP_URL` to your app's URL

**Step 4: Update Google OAuth redirect URIs**
- Add `https://your-domain.com/api/auth/callback/google` to Google Console

**Step 5: Run production DB migration**

```bash
DATABASE_URL="your-production-url" npx prisma db push
```

```bash
git add .do/
git commit -m "chore: add DigitalOcean App Platform configuration"
```

---

## Task 24: Header Credit Sync

The header currently receives `initialCredits` as a prop (server-rendered). After an upscale, credits change but header doesn't update.

**Fix:** Create a `/api/user/credits` route and fetch on mount:

```typescript
// app/api/user/credits/route.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getUserCredits } from "@/lib/credits";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ credits: 0 });
  const credits = await getUserCredits(session.user.id);
  return NextResponse.json({ credits });
}
```

Update `header.tsx` to poll this every 10s or on focus.

```bash
git add app/api/user/ components/layout/header.tsx
git commit -m "feat: sync credit balance in header after upscale"
```

---

## Summary: Environment Variables Checklist

Before each phase, ensure these are set in `.env.local`:

**Phase 1:**
- [ ] `DATABASE_URL`
- [ ] `AUTH_SECRET` (run `npx auth secret`)
- [ ] `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`
- [ ] `DO_SPACES_KEY` / `DO_SPACES_SECRET` / `DO_SPACES_ENDPOINT` / `DO_SPACES_BUCKET` / `DO_SPACES_REGION`
- [ ] `FAL_KEY`

**Phase 2 additions:**
- [ ] `CLAID_API_KEY`
- [ ] `RUNWARE_API_KEY`

**Phase 3 additions:**
- [ ] `LEMONSQUEEZY_API_KEY`
- [ ] `LEMONSQUEEZY_WEBHOOK_SECRET`
- [ ] `LEMONSQUEEZY_STORE_ID`
- [ ] `LS_VARIANT_STARTER` / `LS_VARIANT_POPULAR` / `LS_VARIANT_PRO`
- [ ] `LS_VARIANT_BASIC_SUB` / `LS_VARIANT_PRO_SUB`

---

## Known Risks & Mitigations

| Risk | Mitigation |
|---|---|
| fal.ai API contract changes | Wrap in adapter, easy to update `lib/providers/fal.ts` |
| Claid.ai endpoint structure | Test with real API key before Phase 2 commit |
| Runware SDK version changes | Pin SDK version in package.json |
| Long-running upscale (>60s) | Phase 1 processes in-request (works). Phase 2 todo: queue |
| DO Spaces ACL | Verify `public-read` is allowed on your bucket |
| Lemon Squeezy webhook duplicate events | `lsOrderId` idempotency check in Task 19 |
| NextAuth + Next.js 16 compatibility | Use `next-auth@5` — tested with Next.js 14+ |
