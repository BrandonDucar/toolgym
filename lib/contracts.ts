export type AdapterType = "mcp" | "openapi" | "cli" | "webhook";

export interface CriterionResult {
  id: string;
  label: string;
  passed: boolean;
  critical: boolean;
}

export interface GradeResult {
  score: number;
  passed: boolean;
  criteria: CriterionResult[];
}

export interface ExerciseDefinition {
  id: string;
  version: string;
  title: string;
  lane: "discovery" | "execution" | "safety" | "recovery";
  difficulty: 1 | 2 | 3;
  summary: string;
  estimatedMinutes: number;
  passScore: number;
  packet: Record<string, unknown>;
  responseShape: Record<string, unknown>;
  expectedAnswers: Array<Record<string, unknown>>;
  criteria: Array<{ id: string; label: string; critical?: boolean }>;
}

export interface WorkspaceRecord {
  id: string;
  name: string;
  api_key_hash: string;
  created_at: string;
}

export interface AgentRecord {
  id: string;
  workspace_id: string;
  name: string;
  adapter_type: AdapterType;
  adapter_label: string;
  tool_target: string;
  created_at: string;
}

export interface AttemptRecord {
  id: string;
  workspace_id: string;
  agent_id: string;
  exercise_id: string;
  exercise_version: string;
  response_json: string;
  criteria_json: string;
  score: number;
  passed: number;
  evidence_hash: string;
  created_at: string;
}

export interface FieldExamRecord {
  id: string;
  workspace_id: string;
  agent_id: string;
  task_summary: string;
  evidence_url: string;
  environment_label: string;
  review_token_hash: string;
  reviewer_name: string | null;
  reviewer_notes: string | null;
  status: "pending_review" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
}

export interface CredentialRecord {
  id: string;
  workspace_id: string;
  agent_id: string;
  field_exam_id: string;
  level: string;
  status: string;
  payload_json: string;
  payload_hash: string;
  signature: string | null;
  issued_at: string;
  expires_at: string;
}
