import assert from "node:assert/strict";
import test from "node:test";
import { canonicalize, sha256, signPayload, verifyPayloadSignature } from "../lib/crypto";

test("canonical hashes are stable across object key order", async () => {
  const first = { alpha: 1, beta: { two: 2, one: 1 } };
  const second = { beta: { one: 1, two: 2 }, alpha: 1 };
  assert.equal(canonicalize(first), canonicalize(second));
  assert.equal(await sha256(first), await sha256(second));
});

test("P-256 signatures verify and fail after tampering", async () => {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const [privateJwk, publicJwk] = await Promise.all([
    crypto.subtle.exportKey("jwk", pair.privateKey),
    crypto.subtle.exportKey("jwk", pair.publicKey),
  ]);
  const payload = { agent: "candidate-1", score: 100 };
  const signature = await signPayload(payload, JSON.stringify(privateJwk));
  assert.ok(signature);
  assert.equal(await verifyPayloadSignature(payload, signature, JSON.stringify(publicJwk)), true);
  assert.equal(await verifyPayloadSignature({ ...payload, score: 99 }, signature, JSON.stringify(publicJwk)), false);
});
