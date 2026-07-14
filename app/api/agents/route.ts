import { z } from "zod";
import { requireWorkspace, responseFromError } from "@/lib/auth";
import { database } from "@/lib/database";
import type { AgentRecord } from "@/lib/contracts";

const inputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  adapterType: z.enum(["mcp", "openapi", "cli", "webhook"]),
  adapterLabel: z.string().trim().min(2).max(120),
  toolTarget: z.string().trim().min(2).max(120),
});

export async function GET(request: Request) {
  try {
    const workspace = await requireWorkspace(request);
    const result = await database()
      .prepare("SELECT * FROM agents WHERE workspace_id = ? ORDER BY created_at DESC")
      .bind(workspace.id)
      .all<AgentRecord>();
    return Response.json({ agents: result.results });
  } catch (error) {
    return responseFromError(error);
  }
}

export async function POST(request: Request) {
  try {
    const workspace = await requireWorkspace(request);
    const input = inputSchema.parse(await request.json());
    const agent = {
      id: crypto.randomUUID(),
      workspaceId: workspace.id,
      ...input,
      createdAt: new Date().toISOString(),
    };
    await database()
      .prepare(`INSERT INTO agents
        (id, workspace_id, name, adapter_type, adapter_label, tool_target, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        agent.id,
        agent.workspaceId,
        agent.name,
        agent.adapterType,
        agent.adapterLabel,
        agent.toolTarget,
        agent.createdAt,
      )
      .run();
    return Response.json({ agent }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message }, { status: 400 });
    return responseFromError(error);
  }
}
