import { webcrypto } from "node:crypto";

const pair = await webcrypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"],
);

const [privateJwk, publicJwk] = await Promise.all([
  webcrypto.subtle.exportKey("jwk", pair.privateKey),
  webcrypto.subtle.exportKey("jwk", pair.publicKey),
]);

console.log("TOOLGYM_SIGNING_PRIVATE_JWK=" + JSON.stringify(privateJwk));
console.log("TOOLGYM_SIGNING_PUBLIC_JWK=" + JSON.stringify(publicJwk));
