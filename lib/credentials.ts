import type { AgentRecord, AttemptRecord, FieldExamRecord, LabAttemptRecord } from "./contracts";
import { canonicalize, sha256, signPayload } from "./crypto";

export interface ToolMasteryCredential {
  schema: "https://raw.githubusercontent.com/BrandonDucar/toolgym/main/schemas/agent-tool-mastery-credential-v0.2.schema.json";
  id: string;
  type: ["AgentToolMasteryCredential"];
  issuer: { id: string; name: "ToolGym" };
  validFrom: string;
  validUntil: string;
  credentialSubject: {
    id: string;
    name: string;
    adapter: string;
    achievement: {
      name: string;
      level: "proctored-field-mastery";
        criteriaVersion: "toolgym-core-simulation-1.0.0";
    };
  };
  evidence: {
    workoutReceipts: Array<{ id: string; exerciseId: string; version: string; score: number; hash: string }>;
    simulationReceipts: Array<{ id: string; labId: string; version: string; score: number; hash: string }>;
    fieldExam: {
      id: string;
      taskSummary: string;
      evidenceUrl: string;
      environment: string;
      reviewer: string;
      reviewedAt: string;
      reviewMethod: "independent-human-attestation";
      independentlyAttested: true;
    };
  };
}

export async function issueCredential(input: {
  id: string;
  origin: string;
  agent: AgentRecord;
  attempts: AttemptRecord[];
  labAttempts: LabAttemptRecord[];
  fieldExam: FieldExamRecord;
  privateJwk?: string;
}) {
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
  const payload: ToolMasteryCredential = {
    schema: "https://raw.githubusercontent.com/BrandonDucar/toolgym/main/schemas/agent-tool-mastery-credential-v0.2.schema.json",
    id: `${input.origin}/verify/${input.id}`,
    type: ["AgentToolMasteryCredential"],
    issuer: { id: `${input.origin}/api/keys/current`, name: "ToolGym" },
    validFrom: issuedAt,
    validUntil: expiresAt,
    credentialSubject: {
      id: input.agent.id,
      name: input.agent.name,
      adapter: input.agent.adapter_type,
      achievement: {
        name: `${input.agent.tool_target} tool mastery`,
        level: "proctored-field-mastery",
        criteriaVersion: "toolgym-core-simulation-1.0.0",
      },
    },
    evidence: {
      workoutReceipts: input.attempts.map((attempt) => ({
        id: attempt.id,
        exerciseId: attempt.exercise_id,
        version: attempt.exercise_version,
        score: attempt.score,
        hash: attempt.evidence_hash,
      })),
      simulationReceipts: input.labAttempts.map((attempt) => ({
        id: attempt.id,
        labId: attempt.lab_id,
        version: attempt.lab_version,
        score: attempt.score,
        hash: attempt.evidence_hash,
      })),
      fieldExam: {
        id: input.fieldExam.id,
        taskSummary: input.fieldExam.task_summary,
        evidenceUrl: input.fieldExam.evidence_url,
        environment: input.fieldExam.environment_label,
        reviewer: input.fieldExam.reviewer_name ?? "Independent reviewer",
        reviewedAt: input.fieldExam.reviewed_at ?? issuedAt,
        reviewMethod: "independent-human-attestation",
        independentlyAttested: true,
      },
    },
  };
  const payloadHash = await sha256(payload);
  const signature = await signPayload(payload, input.privateJwk);
  return { payload, payloadJson: canonicalize(payload), payloadHash, signature, issuedAt, expiresAt };
}
