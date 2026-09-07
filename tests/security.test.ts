import assert from "node:assert/strict";
import { describe, it, before } from "node:test";

describe("cookie vault HMAC", () => {
  before(() => {
    process.env.PNK_ID_CLIENT_SECRET = "test-client-secret-for-hmac";
    process.env.MAIL_VAULT_SECRET = "test-vault-secret-min-32-chars!!!!";
  });

  it("rejects tampered payload", async () => {
    const { signPayload, verifySignedPayload } = await import(
      "../lib/cookie-crypto"
    );
    const signed = signPayload("hello");
    const tampered = signed.replace(/^[^.]+/, "hacked");
    assert.equal(verifySignedPayload(tampered), null);
    assert.equal(verifySignedPayload(signed), "hello");
  });

  it("rejects unsigned legacy-looking blob when dotted", async () => {
    const { verifySignedPayload } = await import("../lib/cookie-crypto");
    assert.equal(verifySignedPayload("nosig"), null);
  });
});

describe("assertSameOrigin", async () => {
  const { assertSameOrigin } = await import("../lib/request-guard");

  it("blocks foreign Origin", () => {
    process.env.NEXT_PUBLIC_MAIL_URL = "http://localhost:3000";
    const r = assertSameOrigin({
      headers: new Headers({ origin: "https://evil.example" }),
      nextUrl: { origin: "http://localhost:3000" },
    });
    assert.equal(r.ok, false);
  });

  it("allows matching Origin", () => {
    process.env.NEXT_PUBLIC_MAIL_URL = "http://localhost:3000";
    const r = assertSameOrigin({
      headers: new Headers({ origin: "http://localhost:3000" }),
      nextUrl: { origin: "http://localhost:3000" },
    });
    assert.equal(r.ok, true);
  });
});

describe("sanitizeMailHtml XSS", async () => {
  const { sanitizeMailHtml } = await import("../lib/mail-template");

  it("strips script tags", () => {
    const out = sanitizeMailHtml(
      `<p>Hi</p><script>alert(1)</script><img src=x onerror=alert(1)>`,
    );
    assert.doesNotMatch(out, /<script/i);
    assert.doesNotMatch(out, /onerror/i);
  });

  it("strips javascript: urls", () => {
    const out = sanitizeMailHtml(`<a href="javascript:alert(1)">x</a>`);
    assert.doesNotMatch(out, /javascript:/i);
  });
});

describe("rateLimit send", async () => {
  const { rateLimit } = await import("../lib/rate-limit");

  it("caps burst", () => {
    const key = `send-test-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      assert.equal(rateLimit({ key, limit: 3, windowMs: 60_000 }).ok, true);
    }
    assert.equal(rateLimit({ key, limit: 3, windowMs: 60_000 }).ok, false);
  });
});
