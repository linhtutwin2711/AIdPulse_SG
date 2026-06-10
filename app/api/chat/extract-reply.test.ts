// Functional test for the chat route's reply extractor (app/api/chat/route.ts).
//
// Zero-dependency: uses Node's built-in test runner + assert, and Node 24's
// native TypeScript type-stripping. Run with:
//   node --test app/api/chat/route.test.ts
// or, to run every *.test.ts in the repo:
//   node --test
//
// n8n's "Respond to Webhook" node can return the assistant text in many shapes,
// so this locks down that every shape we expect resolves to the right string
// (and junk resolves to null so the caller can show a fallback message).

import { test } from "node:test";
import assert from "node:assert/strict";

import { extractReply } from "./extract-reply.ts";

test("returns a plain string as-is", () => {
  assert.equal(extractReply("Hello there"), "Hello there");
});

test("unwraps the first item of an array", () => {
  assert.equal(extractReply([{ reply: "From array" }]), "From array");
});

test("pulls the text from each supported key", () => {
  for (const key of ["reply", "output", "text", "message", "answer", "response"]) {
    assert.equal(extractReply({ [key]: "Got it" }), "Got it");
  }
});

test("prefers 'reply' over later keys when several are present", () => {
  assert.equal(extractReply({ reply: "first", output: "second" }), "first");
});

test("ignores empty/whitespace-only string values", () => {
  assert.equal(extractReply({ reply: "   " }), null);
});

test("returns null for unrecognised shapes", () => {
  assert.equal(extractReply(null), null);
  assert.equal(extractReply(42), null);
  assert.equal(extractReply({ unknownKey: "nope" }), null);
});
