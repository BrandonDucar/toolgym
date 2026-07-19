# ToolGym

[![CI](https://github.com/BrandonDucar/toolgym/actions/workflows/ci.yml/badge.svg)](https://github.com/BrandonDucar/toolgym/actions/workflows/ci.yml) [![Live](https://img.shields.io/badge/live-public_alpha-1f8f79)](https://toolgym-ai-agents.bd420chef.chatgpt.site) [![License](https://img.shields.io/github/license/BrandonDucar/toolgym)](LICENSE)


ToolGym is a model-neutral training and evidence platform for AI agents that use tools.

**Live public alpha:** https://toolgym-ai-agents.bd420chef.chatgpt.site

An agent does not earn mastery because it claims a skill or completes a random benchmark. ToolGym separates the qualification path into four artifacts:

1. **Workout receipt** - deterministic evidence from one versioned exercise.
2. **Simulation receipt** - evidence from a realistic, multi-step applied problem.
3. **Qualification record** - proof that every required workout and at least one simulation passed.
4. **Mastery credential** - issued only after an independent proctor reviews authorized real-world work.

> Status: public alpha. The evidence model is implemented and usable, but ToolGym is not yet an accredited certification authority or a certified Open Badges issuer.

## What Works

- Self-service workspaces with one-time API keys stored as hashes.
- Model- and vendor-neutral agent profiles for MCP, OpenAPI, CLI, and webhook adapters.
- Four deterministic core workouts: tool selection, argument discipline, approval gates, and recovery routing.
- Four applied simulation labs: secure repository change, incident recovery, grounded research, and community operations.
- Versioned grading criteria with critical safety failures.
- Public, content-addressed workout receipts.
- Qualification gating before a field test can be requested.
- Private proctor links for reviewing real-work evidence.
- Explicit public-evidence consent and independent-reviewer attestation.
- Six-month mastery credentials after proctor approval.
- ECDSA P-256 issuer signatures when deployment keys are configured.
- Public credential verification, evidence links, and expiry checks.
- Cloudflare Workers and D1 deployment through OpenAI Sites.

## Trust Ladder

```text
Registered candidate
  -> workout attempts
  -> deterministic receipts
  -> core qualification
  -> applied simulation receipt
  -> authorized real task
  -> independent review
  -> signed mastery credential
  -> expiration and recertification
```

Training and certification are deliberately separate. A workspace owner can retry workouts, but cannot approve their own field evidence through the authenticated workspace API.

Field-test summaries and evidence links become part of the public credential. Submit only authorized, non-sensitive evidence. Public alpha proctors are self-declared; an issuer signature proves credential integrity, not the reviewer's legal identity or universal agent competence.

## Local Development

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run db:generate
npm run dev
```

The deployment requires a D1 binding named `DB`. Runtime initialization also creates missing tables so fresh preview databases can start safely.

Generate an issuer key pair locally:

```bash
node scripts/generate-signing-key.mjs
```

Store the private JWK as `TOOLGYM_SIGNING_PRIVATE_JWK` and the public JWK as `TOOLGYM_SIGNING_PUBLIC_JWK`. Never commit the generated values.

## API Surface

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/workspaces` | Create a workspace and one-time API key |
| `GET/POST` | `/api/agents` | List or register candidate agents |
| `GET` | `/api/exercises` | Read the public workout catalog |
| `GET` | `/api/gateway` | Read the model-neutral gateway manifest and supported target catalog |
| `POST` | `/api/attempts` | Grade an agent output and issue a receipt |
| `GET` | `/api/labs` | Read the public applied-simulation catalog |
| `POST` | `/api/lab-attempts` | Grade a simulation and issue a public receipt |
| `GET` | `/api/lab-receipts/:id` | Inspect a public simulation receipt |
| `GET` | `/api/dashboard` | Read workspace qualification state |
| `GET/POST` | `/api/field-exams` | List or request a proctored field test |
| `GET/POST` | `/api/proctor/:token` | Review field evidence using a private token |
| `GET` | `/api/receipts/:id` | Inspect a public workout receipt |
| `GET` | `/api/credentials/:id` | Verify a mastery credential |
| `GET` | `/api/keys/current` | Read the current public issuer key |

Workspace routes require `Authorization: Bearer tg_live_...`.

## Bring Your Own Agent

ToolGym does not store model-provider credentials and does not execute arbitrary remote URLs. Agents receive a JSON workout packet and return a JSON answer through the API or included CLI. This keeps tool execution in the environment the user controls.

The web workspace can generate a private connection packet containing the ToolGym base URL, candidate ID, adapter metadata, and workspace bearer key. Give that packet only to the agent runtime you control. The public `/api/gateway` manifest is safe to inspect without authentication and never contains workspace or provider secrets.

```bash
node cli/toolgym.mjs exercises --url https://your-toolgym.example
node cli/toolgym.mjs labs --url https://your-toolgym.example
node cli/toolgym.mjs submit --url https://your-toolgym.example --key tg_live_... \
  --agent AGENT_ID --exercise tool-selection --file answer.json
node cli/toolgym.mjs submit-lab --url https://your-toolgym.example --key tg_live_... \
  --agent AGENT_ID --lab secure-repository-change --file simulation-answer.json
```

## DreamNet Boundary

ToolGym is independently useful. DreamNet University can assign ToolGym exercises and consume receipts, but its private curriculum, faculty logic, placement criteria, lineage system, and internal performance data are not included here.

## Standards Direction

- JSON Schema for stable artifacts.
- W3C Verifiable Credentials and Open Badges 3.0 as compatibility targets.
- MCP authorization rules for future agent-native workout delivery.
- BrowserGym-compatible adapters for browser tasks without copying its benchmark code.
- FAIR-inspired identifiers, provenance, versioning, and reuse metadata.

See [Architecture](docs/ARCHITECTURE.md), [Standards](docs/STANDARDS.md), and [Verified CERN Transfer](docs/CERN-INTEGRATION.md).

## License

Apache-2.0. See [LICENSE](LICENSE).
