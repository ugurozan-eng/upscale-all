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
