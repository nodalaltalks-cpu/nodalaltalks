import { describe, it, expect } from "vitest";
import { WebCryptoHashService } from "./web-crypto-hash-service";

describe("WebCryptoHashService", () => {
  it("matches the known SHA-256 digest of an empty input", async () => {
    const svc = new WebCryptoHashService();
    const hash = await svc.sha256(new ArrayBuffer(0));
    expect(hash).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("produces different digests for different content, same digest for identical content", async () => {
    const svc = new WebCryptoHashService();
    const a = await svc.sha256(new TextEncoder().encode("sale-deed-contents").buffer);
    const b = await svc.sha256(new TextEncoder().encode("sale-deed-contents").buffer);
    const c = await svc.sha256(new TextEncoder().encode("different-contents").buffer);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
