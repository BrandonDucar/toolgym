import { database, ensureSchema, runtimeEnv } from "@/lib/database";
import { responseFromError } from "@/lib/auth";
import { sha256, verifyPayloadSignature } from "@/lib/crypto";
import type { CredentialRecord } from "@/lib/contracts";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    await ensureSchema();
    const { id } = await context.params;
    const credential = await database().prepare("SELECT * FROM credentials WHERE id = ?").bind(id).first<CredentialRecord>();
    if (!credential) return Response.json({ error: "Credential not found." }, { status: 404 });
    const payload = JSON.parse(credential.payload_json);
    const hashValid = (await sha256(payload)) === credential.payload_hash;
    const signatureValid = credential.signature
      ? await verifyPayloadSignature(payload, credential.signature, runtimeEnv().TOOLGYM_SIGNING_PUBLIC_JWK)
      : false;
    const expired = new Date(credential.expires_at).getTime() <= Date.now();
    return Response.json({
      credential: payload,
      proof: credential.signature
        ? {
            type: "EcdsaP256Sha256",
            verificationMethod: `${new URL(_request.url).origin}/api/keys/current`,
            proofValue: credential.signature,
          }
        : { type: "ToolGymHashProof", digest: credential.payload_hash },
      verification: {
        status: hashValid && signatureValid && !expired ? "verified" : hashValid && !expired ? "hash_only" : "invalid",
        hashValid,
        signatureValid,
        expired,
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return responseFromError(error);
  }
}
