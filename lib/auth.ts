import type { WorkspaceRecord } from "./contracts";
import { database, ensureSchema } from "./database";
import { sha256 } from "./crypto";

export async function requireWorkspace(request: Request): Promise<WorkspaceRecord> {
  await ensureSchema();
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer tg_live_")) {
    throw new Response(JSON.stringify({ error: "A ToolGym API key is required." }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const keyHash = await sha256(authorization.slice("Bearer ".length));
  const workspace = await database()
    .prepare("SELECT id, name, api_key_hash, created_at FROM workspaces WHERE api_key_hash = ?")
    .bind(keyHash)
    .first<WorkspaceRecord>();

  if (!workspace) {
    throw new Response(JSON.stringify({ error: "The ToolGym API key is invalid." }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  return workspace;
}

export function responseFromError(error: unknown): Response {
  if (error instanceof Response) return error;
  console.error(error);
  return Response.json({ error: "ToolGym could not complete the request." }, { status: 500 });
}
