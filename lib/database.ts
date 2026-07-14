import { env } from "cloudflare:workers";

interface ToolGymEnv {
  DB: D1Database;
  TOOLGYM_SIGNING_PRIVATE_JWK?: string;
  TOOLGYM_SIGNING_PUBLIC_JWK?: string;
}

let schemaReady: Promise<void> | undefined;

export function runtimeEnv(): ToolGymEnv {
  return env as unknown as ToolGymEnv;
}

export function database(): D1Database {
  const db = runtimeEnv().DB;
  if (!db) throw new Error("ToolGym requires the Cloudflare D1 binding `DB`.");
  return db;
}

export async function ensureSchema(): Promise<void> {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    const db = database();
    await db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        api_key_hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        name TEXT NOT NULL,
        adapter_type TEXT NOT NULL,
        adapter_label TEXT NOT NULL,
        tool_target TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS attempts (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        exercise_id TEXT NOT NULL,
        exercise_version TEXT NOT NULL,
        response_json TEXT NOT NULL,
        criteria_json TEXT NOT NULL,
        score INTEGER NOT NULL,
        passed INTEGER NOT NULL,
        evidence_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS field_exams (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        task_summary TEXT NOT NULL,
        evidence_url TEXT NOT NULL,
        environment_label TEXT NOT NULL,
        review_token_hash TEXT NOT NULL UNIQUE,
        reviewer_name TEXT,
        reviewer_notes TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        reviewed_at TEXT
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS credentials (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        field_exam_id TEXT NOT NULL UNIQUE,
        level TEXT NOT NULL,
        status TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        payload_hash TEXT NOT NULL,
        signature TEXT,
        issued_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      )`),
      db.prepare("CREATE INDEX IF NOT EXISTS agents_workspace_idx ON agents(workspace_id)"),
      db.prepare("CREATE INDEX IF NOT EXISTS attempts_agent_idx ON attempts(agent_id, created_at)"),
      db.prepare("CREATE INDEX IF NOT EXISTS exams_agent_idx ON field_exams(agent_id, created_at)"),
      db.prepare("CREATE INDEX IF NOT EXISTS credentials_agent_idx ON credentials(agent_id, issued_at)"),
    ]);
  })();
  return schemaReady;
}
