import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/prisma";
import { getUserCredits, hasEnoughCredits, deductCredits, addCredits } from "@/lib/credits";
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

  // Process async (fire-and-forget in Phase 1)
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

    // Phase 1: only fal.ai is implemented; all categories fall through to fal
    const result = await upscaleWithFal({ imageUrl: inputUrl, category, scale });

    // Download result and re-upload to our Spaces for persistence
    const response = await fetch(result.outputUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") ?? "image/png";
    const ext = contentType.split("/")[1].replace("jpeg", "jpg");
    const key = getStorageKey(userId, `${nanoid()}.${ext}`, "output");
    outputUrl = await uploadToSpaces(key, buffer, contentType);

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
    await addCredits(userId, 4, "refund", { jobId });
  }
}
