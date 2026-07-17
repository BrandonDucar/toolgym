import { z } from "zod";
import { responseFromError } from "@/lib/auth";
import { sha256 } from "@/lib/crypto";
import { database, ensureSchema, runtimeEnv } from "@/lib/database";
import { issueCredential } from "@/lib/credentials";
import type { AgentRecord, AttemptRecord, FieldExamRecord, LabAttemptRecord } from "@/lib/contracts";
import { EXERCISES } from "@/lib/catalog";
import { LABS } from "@/lib/labs";

const decisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reviewerName: z.string().trim().min(2).max(100),
  notes: z.string().trim().min(10).max(1200),
  attestIndependent: z.literal(true, { errorMap: () => ({ message: "The reviewer must attest to an independent evidence review." }) }),
});

type Context = { params: Promise<{ token: string }> };

async function findExam(token: string) {
  await ensureSchema();
  const tokenHash = await sha256(token);
  const fieldExam = await database()
    .prepare("SELECT * FROM field_exams WHERE review_token_hash = ?")
    .bind(tokenHash)
    .first<FieldExamRecord>();
  if (!fieldExam) return null;
  const agent = await database().prepare("SELECT * FROM agents WHERE id = ?").bind(fieldExam.agent_id).first<AgentRecord>();
  if (!agent) return null;
  return { fieldExam, agent };
}

export async function GET(_request: Request, context: Context) {
  try {
    const { token } = await context.params;
    const found = await findExam(token);
    if (!found) return Response.json({ error: "Review request not found." }, { status: 404 });
    const [attempts, labAttempts] = await Promise.all([
      database().prepare("SELECT * FROM attempts WHERE agent_id = ? AND passed = 1 ORDER BY created_at DESC").bind(found.agent.id).all<AttemptRecord>(),
      database().prepare("SELECT * FROM lab_attempts WHERE agent_id = ? AND passed = 1 ORDER BY created_at DESC").bind(found.agent.id).all<LabAttemptRecord>(),
    ]);
    const latest = new Map<string, AttemptRecord>();
    for (const attempt of attempts.results) if (!latest.has(attempt.exercise_id)) latest.set(attempt.exercise_id, attempt);
    const latestLabs = new Map<string, LabAttemptRecord>();
    for (const attempt of labAttempts.results) if (!latestLabs.has(attempt.lab_id)) latestLabs.set(attempt.lab_id, attempt);
    return Response.json({
      fieldExam: {
        id: found.fieldExam.id,
        taskSummary: found.fieldExam.task_summary,
        evidenceUrl: found.fieldExam.evidence_url,
        environmentLabel: found.fieldExam.environment_label,
        status: found.fieldExam.status,
        createdAt: found.fieldExam.created_at,
        reviewerName: found.fieldExam.reviewer_name,
        reviewerNotes: found.fieldExam.reviewer_notes,
      },
      agent: {
        id: found.agent.id,
        name: found.agent.name,
        adapterType: found.agent.adapter_type,
        adapterLabel: found.agent.adapter_label,
        toolTarget: found.agent.tool_target,
      },
      workouts: EXERCISES.map((exercise) => {
        const attempt = latest.get(exercise.id);
        return {
          exerciseId: exercise.id,
          title: exercise.title,
          version: attempt?.exercise_version,
          score: attempt?.score,
          evidenceHash: attempt?.evidence_hash,
          passed: Boolean(attempt),
        };
      }),
      simulations: LABS.map((lab) => {
        const attempt = latestLabs.get(lab.id);
        return {
          labId: lab.id,
          title: lab.title,
          version: attempt?.lab_version,
          score: attempt?.score,
          evidenceHash: attempt?.evidence_hash,
          passed: Boolean(attempt),
        };
      }).filter((lab) => lab.passed),
    });
  } catch (error) {
    return responseFromError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const { token } = await context.params;
    const input = decisionSchema.parse(await request.json());
    const found = await findExam(token);
    if (!found) return Response.json({ error: "Review request not found." }, { status: 404 });
    if (found.fieldExam.status !== "pending_review") {
      return Response.json({ error: "This field test has already been reviewed." }, { status: 409 });
    }

    const db = database();
    const reviewedAt = new Date().toISOString();

    if (input.decision === "rejected") {
      const update = await db
        .prepare(`UPDATE field_exams SET status = 'rejected', reviewer_name = ?, reviewer_notes = ?, reviewed_at = ?
          WHERE id = ? AND status = 'pending_review'`)
        .bind(input.reviewerName, input.notes, reviewedAt, found.fieldExam.id)
        .run();
      if ((update.meta.changes ?? 0) !== 1) {
        return Response.json({ error: "This field test was reviewed by someone else." }, { status: 409 });
      }
      return Response.json({ status: "rejected", reviewedAt });
    }

    const passing = await db
      .prepare("SELECT * FROM attempts WHERE agent_id = ? AND passed = 1 ORDER BY created_at DESC")
      .bind(found.agent.id)
      .all<AttemptRecord>();
    const latest = new Map<string, AttemptRecord>();
    for (const attempt of passing.results) if (!latest.has(attempt.exercise_id)) latest.set(attempt.exercise_id, attempt);
    const attempts = EXERCISES.map((exercise) => latest.get(exercise.id)).filter(Boolean) as AttemptRecord[];
    if (attempts.length !== EXERCISES.length) {
      return Response.json({ error: "The workout evidence is no longer complete." }, { status: 409 });
    }
    const passingLabs = await db
      .prepare("SELECT * FROM lab_attempts WHERE agent_id = ? AND passed = 1 ORDER BY created_at DESC")
      .bind(found.agent.id)
      .all<LabAttemptRecord>();
    const validLabIds = new Set(LABS.map((lab) => lab.id));
    const latestLabs = new Map<string, LabAttemptRecord>();
    for (const attempt of passingLabs.results) {
      if (validLabIds.has(attempt.lab_id) && !latestLabs.has(attempt.lab_id)) latestLabs.set(attempt.lab_id, attempt);
    }
    const labAttempts = [...latestLabs.values()];
    if (labAttempts.length === 0) {
      return Response.json({ error: "The simulation evidence is no longer complete." }, { status: 409 });
    }

    const credentialId = crypto.randomUUID();
    const updatedExam: FieldExamRecord = {
      ...found.fieldExam,
      status: "approved",
      reviewer_name: input.reviewerName,
      reviewer_notes: input.notes,
      reviewed_at: reviewedAt,
    };
    const origin = new URL(request.url).origin;
    const issued = await issueCredential({
      id: credentialId,
      origin,
      agent: found.agent,
      attempts,
      labAttempts,
      fieldExam: updatedExam,
      privateJwk: runtimeEnv().TOOLGYM_SIGNING_PRIVATE_JWK,
    });
    const credentialStatus = issued.signature ? "verified" : "hash_only_preview";
    const [update] = await db.batch([
      db.prepare(`UPDATE field_exams SET status = 'approved', reviewer_name = ?, reviewer_notes = ?, reviewed_at = ?
        WHERE id = ? AND status = 'pending_review'`)
        .bind(input.reviewerName, input.notes, reviewedAt, found.fieldExam.id),
      db.prepare(`INSERT INTO credentials
        (id, workspace_id, agent_id, field_exam_id, level, status, payload_json, payload_hash, signature, issued_at, expires_at)
        VALUES (?, ?, ?, ?, 'proctored-field-mastery', ?, ?, ?, ?, ?, ?)`)
        .bind(
        credentialId,
        found.fieldExam.workspace_id,
        found.agent.id,
        found.fieldExam.id,
        credentialStatus,
        issued.payloadJson,
        issued.payloadHash,
        issued.signature,
        issued.issuedAt,
        issued.expiresAt,
        ),
    ]);
    if ((update.meta.changes ?? 0) !== 1) {
      return Response.json({ error: "This field test was reviewed by someone else." }, { status: 409 });
    }
    return Response.json({
      status: "approved",
      credential: {
        id: credentialId,
        status: credentialStatus,
        verifyUrl: `${origin}/verify/${credentialId}`,
        payloadHash: issued.payloadHash,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message }, { status: 400 });
    return responseFromError(error);
  }
}
