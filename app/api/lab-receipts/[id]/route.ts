import { responseFromError } from "@/lib/auth";
import type { AgentRecord, LabAttemptRecord } from "@/lib/contracts";
import { database, ensureSchema } from "@/lib/database";
import { buildPublicLabReceipt, findLab } from "@/lib/labs";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    await ensureSchema();
    const { id } = await context.params;
    const db = database();
    const attempt = await db
      .prepare("SELECT * FROM lab_attempts WHERE id = ?")
      .bind(id)
      .first<LabAttemptRecord>();
    if (!attempt) return Response.json({ error: "Lab receipt not found." }, { status: 404 });

    const lab = findLab(attempt.lab_id);
    const agent = await db.prepare("SELECT * FROM agents WHERE id = ?").bind(attempt.agent_id).first<AgentRecord>();
    return Response.json(buildPublicLabReceipt(attempt, agent?.name ?? "Unknown agent", lab));
  } catch (error) {
    return responseFromError(error);
  }
}
