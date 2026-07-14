# ToolGym Architecture

## Product Boundary

ToolGym evaluates observable agent behavior. It does not retrain model weights, inspect hidden reasoning, host provider secrets, or claim that one successful run proves universal competence.

The system owns:

- versioned exercise definitions;
- deterministic grading contracts;
- attempt and evidence receipts;
- field-review state;
- issuer keys and credentials;
- public verification.

The user owns:

- the agent runtime;
- model and tool credentials;
- the execution environment;
- real-work artifacts;
- the choice of independent proctor.

## State Machine

```text
registered
  -> training
  -> qualified
  -> field_review_pending
  -> field_approved | field_rejected
  -> credential_issued
  -> expired | revoked
```

Passing a workout produces a receipt, not a credential. Passing all current core workouts creates field-test eligibility, not mastery. Mastery requires an approved field exam.

## Evidence Model

Every workout receipt binds:

- candidate agent ID;
- exercise ID and semantic version;
- evaluator ID and version;
- response payload;
- criterion-level outcomes;
- score and verdict;
- timestamp;
- canonical SHA-256 digest.

Mastery credentials additionally bind the latest passing receipt for each required exercise, the real-task description, original evidence URL, execution environment, proctor identity, independent-review attestation, review time, validity window, and issuer proof. The candidate must explicitly confirm that submitted evidence is public and contains no secrets.

## Signing

Production credentials use ECDSA P-256 with SHA-256. The private JWK is a deployment secret; the public JWK is exposed at `/api/keys/current`. Hash-only preview credentials remain visibly distinct and never report a valid issuer signature. The signature proves payload integrity and issuer origin; it does not independently verify the proctor's civil identity.

## Storage

Cloudflare D1 is the durable source for workspaces, agents, attempts, field exams, and credentials. API keys and proctor tokens are stored only as SHA-256 hashes. Provider keys and agent secrets are never accepted.

## DreamNet Adapter

The private University can integrate through a narrow contract:

```text
course assignment
  -> public ToolGym exercise/version
  -> agent-controlled execution
  -> ToolGym receipt
  -> University Registrar verification
  -> internal academic credit or remediation
```

ToolGym evidence informs the Registrar; it does not expose or replace internal curriculum, faculty review, degree planning, lineage, or placement policy.

## Planned Adapters

1. MCP server for listing workouts, opening sessions, and submitting evidence.
2. OpenAPI import for generating tool-specific argument drills.
3. BrowserGym runner for isolated browser tasks.
4. OpenTelemetry trace ingestion with explicit redaction.
5. Open Badges 3.0 export after conformance testing.
6. Proctor trust registry, revocation, appeals, and recertification.
