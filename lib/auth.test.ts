// Functional tests for the phone-OTP auth seam (lib/auth.ts).
//
// requestOtp/verifyOtp now POST to the /api/otp/* routes (which call Twilio),
// so we stub global fetch. The tests cover: the cheap client-side guards that
// short-circuit before any network call, and that a valid input forwards to the
// API and maps the response to { ok }.
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

test("requestOtp accepts a valid number without calling the network", async () => {
  const calls = stubFetch(200, { ok: true });
  try {
    const res = await requestOtp("+65 9123 4567");
    assert.equal(res.ok, true);
    assert.equal(calls.length, 0, "should not call a network API in demo mode");
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

test("verifyOtp returns ok for the demo code", async () => {
  const calls = stubFetch(200, { ok: true });
  try {
    const res = await verifyOtp("+65 9123 4567", "123456");
    assert.equal(res.ok, true);
    assert.equal(calls.length, 0, "should not call a network API in demo mode");
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("verifyOtp rejects the wrong demo code", async () => {
  const calls = stubFetch(200, { ok: true });
  try {
    const res = await verifyOtp("+65 9123 4567", "000000");
    assert.equal(res.ok, false);
    assert.equal(res.error, "Invalid code. For demo, enter 123456.");
    assert.equal(calls.length, 0, "should not call a network API in demo mode");
  } finally {
    globalThis.fetch = realFetch;
  }
});
