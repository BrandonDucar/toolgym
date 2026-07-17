import { z } from "zod";
import { requireWorkspace, responseFromError } from "@/lib/auth";
import type { AgentRecord } from "@/lib/contracts";
import { sha256 } from "@/lib/crypto";
import { database } from "@/lib/database";
import {
  findLab,
  gradeLab,
  loadCoreWorkoutQualification,
  parseLabAttemptInput,
} from "@/lib/labs";

export async function POST(request: Request) {
  try {
    const workspace = await requireWorkspace(request);
    const input = await parseLabAttemptInput(request);
    const lab = findLab(input.labId);
    if (!lab) return Response.json({ error: "Simulation lab not found." }, { status: 404 });

    const db = database();
    const agent = await db
      .prepare("SELECT * FROM agents WHERE id = ? AND workspace_id = ?")
      .bind(input.agentId, workspace.id)
      .first<AgentRecord>();
    if (!agent) return Response.json({ error: "Agent not found." }, { status: 404 });

    const qualification = await loadCoreWorkoutQualification(db, workspace.id, agent.id);
    if (!qualification.canAttemptLab) {
      return Response.json(
        {
          error: "Complete every core workout before attempting a simulation lab.",
          missing: { coreWorkouts: qualification.missingCoreWorkouts },
        },
        { status: 409 },
      );
    }

    const grade = gradeLab(lab, input.response);
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const evidenceEnvelope = {
      schema: "toolgym.lab-receipt.v0.1",
      id,
      agentId: agent.id,
      lab: { id: lab.id, version: lab.version },
      evaluator: { id: "toolgym-deterministic-lab-grader", version: "1.0.0" },
      response: input.response,
      grade,
      createdAt,
    };
    const evidenceHash = await sha256(evidenceEnvelope);
    await db
      .prepare(`INSERT INTO lab_attempts
        (id, workspace_id, agent_id, lab_id, lab_version, response_json, criteria_json, score, passed, evidence_hash, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        id,
        workspace.id,
        agent.id,
        lab.id,
        lab.version,
        JSON.stringify(input.response),
        JSON.stringify(grade.criteria),
        grade.score,
        grade.passed ? 1 : 0,
        evidenceHash,
        createdAt,
      )
      .run();

    const origin = new URL(request.url).origin;
    return Response.json(
      {
        grade,
        receipt: {
          id,
          persistentId: `${origin}/api/lab-receipts/${id}`,
          evidenceHash,
          labId: lab.id,
          labVersion: lab.version,
          issuedAt: createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message }, { status: 400 });
    return responseFromError(error);
  }
}
