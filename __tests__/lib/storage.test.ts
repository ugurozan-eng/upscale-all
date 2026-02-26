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
