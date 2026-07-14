import { z } from "zod";
import { database, ensureSchema } from "@/lib/database";
import { generateApiKey, sha256 } from "@/lib/crypto";
import { responseFromError } from "@/lib/auth";

const inputSchema = z.object({ name: z.string().trim().min(2).max(80) });

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const input = inputSchema.parse(await request.json());
    const apiKey = generateApiKey();
    const workspace = {
      id: crypto.randomUUID(),
      name: input.name,
      apiKeyHash: await sha256(apiKey),
      createdAt: new Date().toISOString(),
    };
    await database()
      .prepare("INSERT INTO workspaces (id, name, api_key_hash, created_at) VALUES (?, ?, ?, ?)")
      .bind(workspace.id, workspace.name, workspace.apiKeyHash, workspace.createdAt)
      .run();
    return Response.json({
      workspace: { id: workspace.id, name: workspace.name, createdAt: workspace.createdAt },
      apiKey,
      warning: "This key is shown once. Keep it private.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message }, { status: 400 });
    return responseFromError(error);
  }
}
