import { requireWorkspace, responseFromError } from "@/lib/auth";
import { database } from "@/lib/database";
import type { AgentRecord, AttemptRecord, CredentialRecord, FieldExamRecord } from "@/lib/contracts";
import { hasQualified } from "@/lib/catalog";

export async function GET(request: Request) {
  try {
    const workspace = await requireWorkspace(request);
    const db = database();
    const [agents, attempts, exams, credentials] = await Promise.all([
      db.prepare("SELECT * FROM agents WHERE workspace_id = ? ORDER BY created_at DESC").bind(workspace.id).all<AgentRecord>(),
      db.prepare("SELECT * FROM attempts WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 100").bind(workspace.id).all<AttemptRecord>(),
      db.prepare("SELECT * FROM field_exams WHERE workspace_id = ? ORDER BY created_at DESC").bind(workspace.id).all<FieldExamRecord>(),
      db.prepare("SELECT * FROM credentials WHERE workspace_id = ? ORDER BY issued_at DESC").bind(workspace.id).all<CredentialRecord>(),
    ]);
    const passedExerciseIds = Array.from(
      new Set(attempts.results.filter((attempt) => Boolean(attempt.passed)).map((attempt) => attempt.exercise_id)),
    );
    return Response.json({
      workspace: { id: workspace.id, name: workspace.name },
      agents: agents.results,
      attempts: attempts.results.map((attempt) => ({
        ...attempt,
        passed: Boolean(attempt.passed),
        criteria: JSON.parse(attempt.criteria_json),
        response_json: undefined,
        criteria_json: undefined,
      })),
      fieldExams: exams.results,
      credentials: credentials.results.map((credential) => ({
        ...credential,
        payload: JSON.parse(credential.payload_json),
        payload_json: undefined,
      })),
      qualification: {
        passedExerciseIds,
        qualified: hasQualified(passedExerciseIds),
      },
    });
  } catch (error) {
    return responseFromError(error);
  }
}
