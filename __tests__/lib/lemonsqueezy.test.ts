jest.mock("@lemonsqueezy/lemonsqueezy.js", () => ({
  lemonSqueezySetup: jest.fn(),
}));

import { CREDIT_PACKAGES, SUBSCRIPTION_PLANS } from "@/lib/lemonsqueezy";

describe("Lemon Squeezy config", () => {
  it("has 3 credit packages", () => {
    expect(Object.keys(CREDIT_PACKAGES)).toHaveLength(3);
  });

  it("starter package has 40 credits", () => {
    expect(CREDIT_PACKAGES.starter.credits).toBe(40);
  });

  it("popular package has 120 credits", () => {
    expect(CREDIT_PACKAGES.popular.credits).toBe(120);
  });

  it("pro pack has 400 credits", () => {
    expect(CREDIT_PACKAGES.pro.credits).toBe(400);
  });

  it("has 2 subscription plans", () => {
    expect(Object.keys(SUBSCRIPTION_PLANS)).toHaveLength(2);
  });

  it("basic plan has 200 monthly credits", () => {
    expect(SUBSCRIPTION_PLANS.basic.monthlyCredits).toBe(200);
  });

  it("pro plan has 600 monthly credits", () => {
    expect(SUBSCRIPTION_PLANS.pro.monthlyCredits).toBe(600);
  });
});
