import { runtimeEnv } from "@/lib/database";

export async function GET() {
  const value = runtimeEnv().TOOLGYM_SIGNING_PUBLIC_JWK;
  if (!value) return Response.json({ configured: false, error: "No production signing key is configured." }, { status: 503 });
  const key = JSON.parse(value) as JsonWebKey;
  return Response.json({
    configured: true,
    key: { ...key, use: "sig", alg: "ES256", kid: "toolgym-issuer-p256-v1" },
  });
}
