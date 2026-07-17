export const ADAPTER_IDS = ["mcp", "openapi", "cli", "webhook"] as const;

export type AdapterId = (typeof ADAPTER_IDS)[number];

export const ADAPTERS: ReadonlyArray<{
  id: AdapterId;
  label: string;
  description: string;
  suggestedLabel: string;
}> = [
  {
    id: "mcp",
    label: "MCP",
    description: "Your agent discovers and calls tools through a Model Context Protocol server.",
    suggestedLabel: "Local MCP server",
  },
  {
    id: "openapi",
    label: "OpenAPI",
    description: "Your agent calls a REST API described by an OpenAPI document or typed client.",
    suggestedLabel: "OpenAPI client",
  },
  {
    id: "cli",
    label: "CLI",
    description: "Your agent operates a command-line tool in its own terminal or sandbox.",
    suggestedLabel: "Local command-line runner",
  },
  {
    id: "webhook",
    label: "Webhook",
    description: "Your agent receives a workout packet and returns results through an HTTP callback flow.",
    suggestedLabel: "Private webhook bridge",
  },
];

export const CUSTOM_TOOL_TARGET_ID = "custom-skill";

export const TOOL_TARGETS = [
  {
    id: "github-operations",
    label: "GitHub operations",
    description: "Repository inspection, branches, pull requests, issues, and bounded code changes.",
  },
  {
    id: "web-research",
    label: "Web research",
    description: "Source discovery, citation discipline, freshness checks, and evidence synthesis.",
  },
  {
    id: "browser-automation",
    label: "Browser automation",
    description: "Page navigation, forms, screenshots, extraction, and guarded browser actions.",
  },
  {
    id: "cloud-deployment",
    label: "Cloud deployment",
    description: "Build, preview, health verification, rollout, and rollback workflows.",
  },
  {
    id: "database-operations",
    label: "Database operations",
    description: "Schema-aware reads, migrations, transactions, validation, and recovery.",
  },
  {
    id: "messaging-community",
    label: "Messaging and community",
    description: "Drafting, routing, moderation, notifications, and approval-aware publishing.",
  },
  {
    id: "files-documents",
    label: "Files and documents",
    description: "Document creation, transformation, extraction, organization, and access boundaries.",
  },
  {
    id: "commerce-payments",
    label: "Commerce and payments",
    description: "Catalog, checkout, billing, transaction safety, and receipt generation.",
  },
  {
    id: CUSTOM_TOOL_TARGET_ID,
    label: "Custom skill",
    description: "Define a different tool, workflow, or capability that your agent needs to master.",
  },
] as const;

export function buildGatewayManifest(baseUrl: string) {
  return {
    schema: "https://toolgym.ai/schemas/agent-gateway/v1",
    version: "1.0.0",
    name: "ToolGym Agent Gateway",
    description: "Model-neutral REST gateway for registering agents, fetching workouts, submitting attempts, and reading qualification evidence.",
    baseUrl,
    authentication: {
      type: "bearer",
      header: "Authorization: Bearer <toolgym_api_key>",
      storage: "The server stores only a SHA-256 hash of each ToolGym API key.",
      providerCredentials: "ToolGym does not request or store model-provider API keys.",
    },
    adapters: ADAPTERS,
    toolTargets: TOOL_TARGETS,
    endpoints: {
      createWorkspace: { method: "POST", path: "/api/workspaces", authentication: false },
      registerAgent: { method: "POST", path: "/api/agents", authentication: true },
      listWorkouts: { method: "GET", path: "/api/exercises", authentication: false },
      submitAttempt: { method: "POST", path: "/api/attempts", authentication: true },
      readDashboard: { method: "GET", path: "/api/dashboard", authentication: true },
      requestFieldExam: { method: "POST", path: "/api/field-exams", authentication: true },
    },
    flow: [
      "Create a workspace and store the one-time ToolGym API key privately.",
      "Register the candidate agent and describe how it reaches the target tool.",
      "Fetch a workout packet, run it in the user's own agent environment, and submit only the structured result.",
      "Pass all core workouts, submit public authorized field evidence, and obtain independent proctor review.",
    ],
  } as const;
}
