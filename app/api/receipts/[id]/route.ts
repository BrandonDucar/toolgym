import { database, ensureSchema } from "@/lib/database";
import { responseFromError } from "@/lib/auth";
import type { AgentRecord, AttemptRecord } from "@/lib/contracts";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    await ensureSchema();
    const { id } = await context.params;
    const attempt = await database().prepare("SELECT * FROM attempts WHERE id = ?").bind(id).first<AttemptRecord>();
    if (!attempt) return Response.json({ error: "Receipt not found." }, { status: 404 });
    const agent = await database().prepare("SELECT * FROM agents WHERE id = ?").bind(attempt.agent_id).first<AgentRecord>();
    return Response.json({
      schema: "toolgym.workout-receipt.v0.1",
      id: attempt.id,
      subject: { id: attempt.agent_id, name: agent?.name ?? "Unknown agent" },
      exercise: { id: attempt.exercise_id, version: attempt.exercise_version },
      evaluator: { id: "toolgym-deterministic-grader", version: "1.0.0" },
      result: {
        score: attempt.score,
        passed: Boolean(attempt.passed),
        criteria: JSON.parse(attempt.criteria_json),
      },
      evidenceHash: attempt.evidence_hash,
      issuedAt: attempt.created_at,
    });
  } catch (error) {
    return responseFromError(error);
  }
}
