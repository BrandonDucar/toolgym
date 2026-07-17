import { requireWorkspace, responseFromError } from "@/lib/auth";
import { database } from "@/lib/database";
import type { AgentRecord, AttemptRecord, CredentialRecord, FieldExamRecord } from "@/lib/contracts";
import { hasQualified } from "@/lib/catalog";

type LabAttemptRecord = {
  id: string;
  workspace_id: string;
  agent_id: string;
  lab_id: string;
  lab_version: string;
  criteria_json: string;
  score: number;
  passed: number;
  evidence_hash: string;
  created_at: string;
};

export async function GET(request: Request) {
  try {
    const workspace = await requireWorkspace(request);
    const db = database();
    const [agents, attempts, labAttempts, exams, credentials] = await Promise.all([
      db.prepare("SELECT * FROM agents WHERE workspace_id = ? ORDER BY created_at DESC").bind(workspace.id).all<AgentRecord>(),
      db.prepare("SELECT * FROM attempts WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 100").bind(workspace.id).all<AttemptRecord>(),
      db.prepare("SELECT * FROM lab_attempts WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 100").bind(workspace.id).all<LabAttemptRecord>(),
      db.prepare("SELECT * FROM field_exams WHERE workspace_id = ? ORDER BY created_at DESC").bind(workspace.id).all<FieldExamRecord>(),
      db.prepare("SELECT * FROM credentials WHERE workspace_id = ? ORDER BY issued_at DESC").bind(workspace.id).all<CredentialRecord>(),
    ]);
    const qualifications = Object.fromEntries(agents.results.map((agent) => {
      const passedExerciseIds = Array.from(new Set(
        attempts.results
          .filter((attempt) => attempt.agent_id === agent.id && Boolean(attempt.passed))
          .map((attempt) => attempt.exercise_id),
      ));
      const passedLabIds = Array.from(new Set(
        labAttempts.results
          .filter((attempt) => attempt.agent_id === agent.id && Boolean(attempt.passed))
          .map((attempt) => attempt.lab_id),
      ));
      const coreQualified = hasQualified(passedExerciseIds);
      return [agent.id, {
        passedExerciseIds,
        passedLabIds,
        coreQualified,
        simulationQualified: passedLabIds.length > 0,
        fieldEligible: coreQualified && passedLabIds.length > 0,
      }];
    }));
    const firstQualification = agents.results[0] ? qualifications[agents.results[0].id] : undefined;
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
      labAttempts: labAttempts.results.map((attempt) => ({
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
      qualifications,
      qualification: {
        passedExerciseIds: firstQualification?.passedExerciseIds ?? [],
        qualified: firstQualification?.coreQualified ?? false,
      },
    });
  } catch (error) {
    return responseFromError(error);
  }
}
