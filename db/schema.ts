import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  apiKeyHash: text("api_key_hash").notNull().unique(),
  createdAt: text("created_at").notNull(),
});

export const agents = sqliteTable("agents", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  name: text("name").notNull(),
  adapterType: text("adapter_type").notNull(),
  adapterLabel: text("adapter_label").notNull(),
  toolTarget: text("tool_target").notNull(),
  createdAt: text("created_at").notNull(),
});

export const attempts = sqliteTable("attempts", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  agentId: text("agent_id").notNull(),
  exerciseId: text("exercise_id").notNull(),
  exerciseVersion: text("exercise_version").notNull(),
  responseJson: text("response_json").notNull(),
  criteriaJson: text("criteria_json").notNull(),
  score: integer("score").notNull(),
  passed: integer("passed", { mode: "boolean" }).notNull(),
  evidenceHash: text("evidence_hash").notNull(),
  createdAt: text("created_at").notNull(),
});

export const fieldExams = sqliteTable("field_exams", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  agentId: text("agent_id").notNull(),
  taskSummary: text("task_summary").notNull(),
  evidenceUrl: text("evidence_url").notNull(),
  environmentLabel: text("environment_label").notNull(),
  reviewTokenHash: text("review_token_hash").notNull().unique(),
  reviewerName: text("reviewer_name"),
  reviewerNotes: text("reviewer_notes"),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
  reviewedAt: text("reviewed_at"),
});

export const credentials = sqliteTable("credentials", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  agentId: text("agent_id").notNull(),
  fieldExamId: text("field_exam_id").notNull().unique(),
  level: text("level").notNull(),
  status: text("status").notNull(),
  payloadJson: text("payload_json").notNull(),
  payloadHash: text("payload_hash").notNull(),
  signature: text("signature"),
  issuedAt: text("issued_at").notNull(),
  expiresAt: text("expires_at").notNull(),
});
