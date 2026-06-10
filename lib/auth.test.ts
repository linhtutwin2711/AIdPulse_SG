// Functional tests for the phone-OTP auth seam (lib/auth.ts).
//
// Zero-dependency: uses Node's built-in test runner + assert, and Node 24's
// native TypeScript type-stripping. Run with:
//   node --test lib/auth.test.ts
// or, to run every *.test.ts in the repo:
//   node --test

import { test } from "node:test";
import assert from "node:assert/strict";

import { requestOtp, verifyOtp } from "./auth.ts";

test("requestOtp accepts a phone number with enough digits", async () => {
  const res = await requestOtp("+65 9123 4567");
  assert.equal(res.ok, true);
});

test("requestOtp rejects a number with fewer than 7 digits", async () => {
  const res = await requestOtp("+65 123");
  assert.equal(res.ok, false);
});

test("requestOtp ignores non-digit characters when counting length", async () => {
  // 7 digits split across spaces/dashes/parens still counts as valid.
  const res = await requestOtp("(12) 34-567");
  assert.equal(res.ok, true);
});

test("verifyOtp accepts any well-formed 6-digit code", async () => {
  const res = await verifyOtp("+65 9123 4567", "123456");
  assert.equal(res.ok, true);
});

test("verifyOtp rejects a code that is not exactly 6 digits", async () => {
  assert.equal((await verifyOtp("+65 9123 4567", "12345")).ok, false);
  assert.equal((await verifyOtp("+65 9123 4567", "1234567")).ok, false);
  assert.equal((await verifyOtp("+65 9123 4567", "12a456")).ok, false);
});
