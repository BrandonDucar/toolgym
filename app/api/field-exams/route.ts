import { z } from "zod";
import { requireWorkspace, responseFromError } from "@/lib/auth";
import { database } from "@/lib/database";
import { generateReviewToken, sha256 } from "@/lib/crypto";
import type { AgentRecord, FieldExamRecord } from "@/lib/contracts";
import { loadFieldExamQualification } from "@/lib/labs";

const inputSchema = z.object({
  agentId: z.string().uuid(),
  taskSummary: z.string().trim().min(20).max(800),
  evidenceUrl: z.string().url().refine((value) => value.startsWith("https://") || value.startsWith("http://"), "Evidence must use HTTP or HTTPS."),
  environmentLabel: z.string().trim().min(3).max(160),
  confirmPublicEvidence: z.literal(true, { errorMap: () => ({ message: "Confirm that the evidence is public and contains no secrets." }) }),
});

export async function GET(request: Request) {
  try {
    const workspace = await requireWorkspace(request);
    const result = await database()
      .prepare("SELECT * FROM field_exams WHERE workspace_id = ? ORDER BY created_at DESC")
      .bind(workspace.id)
      .all<FieldExamRecord>();
    return Response.json({ fieldExams: result.results });
  } catch (error) {
    return responseFromError(error);
  }
}

export async function POST(request: Request) {
  try {
    const workspace = await requireWorkspace(request);
    const input = inputSchema.parse(await request.json());
    const db = database();
    const agent = await db
      .prepare("SELECT * FROM agents WHERE id = ? AND workspace_id = ?")
      .bind(input.agentId, workspace.id)
      .first<AgentRecord>();
    if (!agent) return Response.json({ error: "Agent not found." }, { status: 404 });

    const qualification = await loadFieldExamQualification(db, workspace.id, agent.id);
    if (!qualification.canRequestFieldExam) {
      return Response.json(
        {
          error: "Complete every core workout and pass at least one simulation lab before requesting a field test.",
          missing: qualification.missing,
        },
        { status: 409 },
      );
    }

    const reviewToken = generateReviewToken();
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await db
      .prepare(`INSERT INTO field_exams
        (id, workspace_id, agent_id, task_summary, evidence_url, environment_label, review_token_hash, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_review', ?)`)
      .bind(
        id,
        workspace.id,
        agent.id,
        input.taskSummary,
        input.evidenceUrl,
        input.environmentLabel,
        await sha256(reviewToken),
        createdAt,
      )
      .run();
    const origin = new URL(request.url).origin;
    return Response.json({
      fieldExam: { id, status: "pending_review", createdAt },
      reviewUrl: `${origin}/proctor/${reviewToken}`,
      note: "Share this one-time review URL with an independent proctor.",
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message }, { status: 400 });
    return responseFromError(error);
  }
}
