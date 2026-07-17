import { buildGatewayManifest } from "@/lib/gateway";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return Response.json(buildGatewayManifest(origin), {
    headers: {
      "cache-control": "public, max-age=300",
    },
  });
}
