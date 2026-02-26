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
