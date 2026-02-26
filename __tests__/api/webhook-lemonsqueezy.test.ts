import crypto from "crypto";

// Helper: create valid HMAC signature
function makeSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

describe("webhook signature verification", () => {
  const secret = "test-webhook-secret";

  it("produces consistent HMAC for same payload", () => {
    const payload = JSON.stringify({ test: "data" });
    const sig1 = makeSignature(payload, secret);
    const sig2 = makeSignature(payload, secret);
    expect(sig1).toBe(sig2);
  });

  it("produces different HMAC for different payload", () => {
    const sig1 = makeSignature("payload-a", secret);
    const sig2 = makeSignature("payload-b", secret);
    expect(sig1).not.toBe(sig2);
  });

  it("HMAC is 64 hex characters (SHA-256)", () => {
    const sig = makeSignature("test", secret);
    expect(sig).toHaveLength(64);
    expect(sig).toMatch(/^[0-9a-f]+$/);
  });
});
