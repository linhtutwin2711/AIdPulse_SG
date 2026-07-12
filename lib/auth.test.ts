// Functional tests for the phone-OTP auth seam (lib/auth.ts).
//
// requestOtp/verifyOtp POST to the /api/otp/* routes (which call Twilio), so we
// stub global fetch. Covered: the cheap client-side guards that short-circuit
// before any network call, the real path (200 → SMS sent, server-verified
// code), and the demo fallback (503/offline → on-screen code 123456).
//
// Zero-dependency: uses Node's built-in test runner + assert, and Node 24's
// native TypeScript type-stripping. Run with:
//   node --test lib/auth.test.ts
// or, to run every *.test.ts in the repo:
//   node --test

import { test } from "node:test";
import assert from "node:assert/strict";

import { requestOtp, verifyOtp } from "./auth.ts";

type FetchInput = { body?: unknown };
const realFetch = globalThis.fetch;

// Stub fetch with a fixed JSON response; returns the captured request bodies.
function stubFetch(status: number, json: unknown) {
  const calls: { url: string; body: unknown }[] = [];
  globalThis.fetch = (async (url: string, init?: FetchInput) => {
    calls.push({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : undefined });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => json,
    } as Response;
  }) as typeof fetch;
  return calls;
}

test("requestOtp rejects a number with fewer than 7 digits (no network)", async () => {
  const calls = stubFetch(200, { ok: true });
  try {
    const res = await requestOtp("+65 123");
    assert.equal(res.ok, false);
    assert.equal(calls.length, 0, "should short-circuit before calling the API");
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("requestOtp posts the E.164 number and reports real mode on 200", async () => {
  const calls = stubFetch(200, { ok: true });
  try {
    const res = await requestOtp("+65 9123 4567");
    assert.equal(res.ok, true);
    assert.equal(res.demo, false);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "/api/otp/send");
    assert.deepEqual(calls[0].body, { phone: "+6591234567" });
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("real mode: verifyOtp is decided by the server, not the demo code", async () => {
  // Arm real mode first (send → 200).
  let calls = stubFetch(200, { ok: true });
  try {
    await requestOtp("+65 9123 4567");

    // Server approves → ok, and the code went to /api/otp/verify.
    calls = stubFetch(200, { ok: true });
    const good = await verifyOtp("+65 9123 4567", "987654");
    assert.equal(good.ok, true);
    assert.equal(calls[0].url, "/api/otp/verify");
    assert.deepEqual(calls[0].body, { phone: "+6591234567", code: "987654" });

    // Server rejects → error surfaced; demo code gets no special treatment.
    stubFetch(401, { error: "Incorrect or expired code." });
    const bad = await verifyOtp("+65 9123 4567", "123456");
    assert.equal(bad.ok, false);
    assert.equal(bad.error, "Incorrect or expired code.");
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("verifyOtp rejects a code that is not exactly 6 digits (no network)", async () => {
  const calls = stubFetch(200, { ok: true });
  try {
    assert.equal((await verifyOtp("+65 9123 4567", "12345")).ok, false);
    assert.equal((await verifyOtp("+65 9123 4567", "1234567")).ok, false);
    assert.equal((await verifyOtp("+65 9123 4567", "12a456")).ok, false);
    assert.equal(calls.length, 0, "should short-circuit before calling the API");
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("503 from send falls back to demo mode: 123456 works, others fail, offline", async () => {
  // Arm demo mode (send → 503 not-configured).
  let calls = stubFetch(503, { error: "SMS verification is not configured." });
  try {
    const sent = await requestOtp("+65 9123 4567");
    assert.equal(sent.ok, true);
    assert.equal(sent.demo, true);

    // Demo verification never touches the network.
    calls = stubFetch(200, { ok: true });
    assert.equal((await verifyOtp("+65 9123 4567", "123456")).ok, true);
    const wrong = await verifyOtp("+65 9123 4567", "000000");
    assert.equal(wrong.ok, false);
    assert.equal(wrong.error, "Invalid code. For demo, enter 123456.");
    assert.equal(calls.length, 0, "demo mode must not call the verify API");
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("network failure on send falls back to demo mode", async () => {
  globalThis.fetch = (async () => {
    throw new Error("offline");
  }) as typeof fetch;
  try {
    const res = await requestOtp("+65 9123 4567");
    assert.equal(res.ok, true);
    assert.equal(res.demo, true);
  } finally {
    globalThis.fetch = realFetch;
  }
});
