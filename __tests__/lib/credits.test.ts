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
