import { getClaidEndpoint } from "@/lib/providers/claid";

describe("Claid provider", () => {
  it("portrait category uses portrait endpoint", () => {
    expect(getClaidEndpoint("portrait")).toBe("/v1-beta1/image/upscale/portrait");
  });
  it("product category uses smart endpoint", () => {
    expect(getClaidEndpoint("product")).toBe("/v1-beta1/image/upscale/smart");
  });
  it("unknown category falls back to smart endpoint", () => {
    expect(getClaidEndpoint("unknown")).toBe("/v1-beta1/image/upscale/smart");
  });
});
