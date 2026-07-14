import { z } from "zod";
import { requireWorkspace, responseFromError } from "@/lib/auth";
import { findExercise, gradeExercise } from "@/lib/catalog";
import { sha256 } from "@/lib/crypto";
import { database } from "@/lib/database";
import type { AgentRecord } from "@/lib/contracts";

const inputSchema = z.object({
  agentId: z.string().uuid(),
  exerciseId: z.string().min(1),
  response: z.unknown(),
});

export async function POST(request: Request) {
  try {
    const workspace = await requireWorkspace(request);
    const input = inputSchema.parse(await request.json());
    const exercise = findExercise(input.exerciseId);
    if (!exercise) return Response.json({ error: "Exercise not found." }, { status: 404 });

    const agent = await database()
      .prepare("SELECT * FROM agents WHERE id = ? AND workspace_id = ?")
      .bind(input.agentId, workspace.id)
      .first<AgentRecord>();
    if (!agent) return Response.json({ error: "Agent not found." }, { status: 404 });

    const grade = gradeExercise(exercise, input.response);
    const createdAt = new Date().toISOString();
    const id = crypto.randomUUID();
    const evidenceEnvelope = {
      schema: "toolgym.workout-receipt.v0.1",
      id,
      agentId: agent.id,
      exercise: { id: exercise.id, version: exercise.version },
      evaluator: { id: "toolgym-deterministic-grader", version: "1.0.0" },
      response: input.response,
      grade,
      createdAt,
    };
    const evidenceHash = await sha256(evidenceEnvelope);
    await database()
      .prepare(`INSERT INTO attempts
        (id, workspace_id, agent_id, exercise_id, exercise_version, response_json, criteria_json, score, passed, evidence_hash, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        id,
        workspace.id,
        agent.id,
        exercise.id,
        exercise.version,
        JSON.stringify(input.response),
        JSON.stringify(grade.criteria),
        grade.score,
        grade.passed ? 1 : 0,
        evidenceHash,
        createdAt,
      )
      .run();

    const origin = new URL(request.url).origin;
    return Response.json({
      grade,
      receipt: {
        id,
        persistentId: `${origin}/api/receipts/${id}`,
        evidenceHash,
        exerciseId: exercise.id,
        exerciseVersion: exercise.version,
        issuedAt: createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message }, { status: 400 });
    return responseFromError(error);
  }
}
