"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bot,
  Braces,
  Check,
  ChevronRight,
  CircleGauge,
  ClipboardCheck,
  Copy,
  Dumbbell,
  ExternalLink,
  FileCheck2,
  KeyRound,
  LockKeyhole,
  LogOut,
  Play,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

type Exercise = {
  id: string;
  version: string;
  title: string;
  lane: string;
  difficulty: number;
  summary: string;
  estimatedMinutes: number;
  passScore: number;
  packet: Record<string, unknown>;
  responseShape: Record<string, unknown>;
};

type Dashboard = {
  workspace: { id: string; name: string };
  agents: Array<{
    id: string;
    name: string;
    adapter_type: string;
    adapter_label: string;
    tool_target: string;
  }>;
  attempts: Array<{
    id: string;
    exercise_id: string;
    exercise_version: string;
    score: number;
    passed: boolean;
    evidence_hash: string;
    created_at: string;
  }>;
  fieldExams: Array<{
    id: string;
    task_summary: string;
    evidence_url: string;
    status: string;
    reviewer_name: string | null;
    created_at: string;
  }>;
  credentials: Array<{
    id: string;
    status: string;
    payload_hash: string;
    issued_at: string;
    expires_at: string;
  }>;
  qualification: { passedExerciseIds: string[]; qualified: boolean };
};

const STORAGE_KEY = "toolgym_api_key";

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}

async function readError(response: Response) {
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  return data.error ?? `Request failed (${response.status})`;
}

export default function ToolGymApp() {
  const [apiKey, setApiKey] = useState("");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedId, setSelectedId] = useState("tool-selection");
  const [submission, setSubmission] = useState("");
  const [notice, setNotice] = useState<{ tone: "good" | "bad" | "info"; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [reviewUrl, setReviewUrl] = useState("");
  const [setup, setSetup] = useState({
    workspaceName: "My agent lab",
    agentName: "",
    adapterType: "mcp",
    adapterLabel: "",
    toolTarget: "",
  });
  const [fieldTest, setFieldTest] = useState({ taskSummary: "", evidenceUrl: "", environmentLabel: "", confirmPublicEvidence: false });

  const authFetch = useCallback(
    (input: RequestInfo | URL, init: RequestInit = {}) =>
      fetch(input, {
        ...init,
        headers: { ...init.headers, authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      }),
    [apiKey],
  );

  const refreshDashboard = useCallback(async () => {
    if (!apiKey) return;
    const response = await authFetch("/api/dashboard", { cache: "no-store" });
    if (!response.ok) throw new Error(await readError(response));
    setDashboard((await response.json()) as Dashboard);
  }, [apiKey, authFetch]);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) ?? "";
    let active = true;

    queueMicrotask(() => {
      if (active) setApiKey(saved);
    });

    async function loadCatalog() {
      try {
        const response = await fetch("/api/exercises");
        if (!response.ok) throw new Error("Catalog request failed");
        const data = (await response.json()) as { exercises: Exercise[] };
        if (!active) return;
        setExercises(data.exercises);
        if (data.exercises[0]) setSubmission(pretty(data.exercises[0].responseShape));
      } catch {
        if (active) setNotice({ tone: "bad", message: "The workout catalog is unavailable." });
      }
    }

    void loadCatalog();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!apiKey) return;
    let active = true;

    async function restoreDashboard() {
      try {
        const response = await authFetch("/api/dashboard", { cache: "no-store" });
        if (!response.ok) throw new Error(await readError(response));
        const restored = (await response.json()) as Dashboard;
        if (active) setDashboard(restored);
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : "Workspace restore failed.";
        setNotice({ tone: "bad", message });
        if (message.toLowerCase().includes("invalid")) {
          window.localStorage.removeItem(STORAGE_KEY);
          setApiKey("");
        }
      }
    }

    void restoreDashboard();
    return () => {
      active = false;
    };
  }, [apiKey, authFetch]);

  const selected = useMemo(() => exercises.find((exercise) => exercise.id === selectedId) ?? exercises[0], [exercises, selectedId]);
  const currentAgent = dashboard?.agents[0];
  const latestAttempts = useMemo(() => {
    const map = new Map<string, Dashboard["attempts"][number]>();
    for (const attempt of dashboard?.attempts ?? []) if (!map.has(attempt.exercise_id)) map.set(attempt.exercise_id, attempt);
    return map;
  }, [dashboard]);

  function selectExercise(exercise: Exercise) {
    setSelectedId(exercise.id);
    setSubmission(pretty(exercise.responseShape));
  }

  async function onboard(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const workspaceResponse = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: setup.workspaceName }),
      });
      if (!workspaceResponse.ok) throw new Error(await readError(workspaceResponse));
      const workspaceData = (await workspaceResponse.json()) as { apiKey: string };
      const key = workspaceData.apiKey;
      const agentResponse = await fetch("/api/agents", {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({
          name: setup.agentName,
          adapterType: setup.adapterType,
          adapterLabel: setup.adapterLabel,
          toolTarget: setup.toolTarget,
        }),
      });
      if (!agentResponse.ok) throw new Error(await readError(agentResponse));
      window.localStorage.setItem(STORAGE_KEY, key);
      setApiKey(key);
      setNotice({ tone: "good", message: "Agent registered. The first workout is ready." });
    } catch (error) {
      setNotice({ tone: "bad", message: error instanceof Error ? error.message : "Setup failed." });
    } finally {
      setBusy(false);
    }
  }

  async function submitWorkout() {
    if (!selected || !currentAgent) return;
    setBusy(true);
    setNotice(null);
    try {
      const parsed = JSON.parse(submission);
      const response = await authFetch("/api/attempts", {
        method: "POST",
        body: JSON.stringify({ agentId: currentAgent.id, exerciseId: selected.id, response: parsed }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as { grade: { score: number; passed: boolean }; receipt: { id: string } };
      setNotice({
        tone: data.grade.passed ? "good" : "bad",
        message: data.grade.passed
          ? `Passed at ${data.grade.score}%. Receipt ${data.receipt.id.slice(0, 8)} issued.`
          : `Scored ${data.grade.score}%. Review the failed checks and try again.`,
      });
      await refreshDashboard();
    } catch (error) {
      setNotice({ tone: "bad", message: error instanceof Error ? error.message : "Workout submission failed." });
    } finally {
      setBusy(false);
    }
  }

  async function requestFieldTest(event: React.FormEvent) {
    event.preventDefault();
    if (!currentAgent) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await authFetch("/api/field-exams", {
        method: "POST",
        body: JSON.stringify({ agentId: currentAgent.id, ...fieldTest }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as { reviewUrl: string };
      setReviewUrl(data.reviewUrl);
      setNotice({ tone: "good", message: "Field test recorded. Send the private review link to an independent proctor." });
      await refreshDashboard();
    } catch (error) {
      setNotice({ tone: "bad", message: error instanceof Error ? error.message : "Field test request failed." });
    } finally {
      setBusy(false);
    }
  }

  function resetWorkspace() {
    window.localStorage.removeItem(STORAGE_KEY);
    setApiKey("");
    setDashboard(null);
    setNotice({ tone: "info", message: "This browser is disconnected from the workspace." });
  }

  async function copy(value: string, message: string) {
    await navigator.clipboard.writeText(value);
    setNotice({ tone: "info", message });
  }

  const pathStatus = [
    { label: "Connect", done: Boolean(currentAgent) },
    { label: "Train", done: (dashboard?.attempts.length ?? 0) > 0 },
    { label: "Qualify", done: Boolean(dashboard?.qualification.qualified) },
    { label: "Field test", done: dashboard?.fieldExams.some((exam) => exam.status === "approved") ?? false },
    { label: "Credential", done: (dashboard?.credentials.length ?? 0) > 0 },
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="ToolGym home">
          <span className="brand-mark"><Dumbbell size={19} strokeWidth={2.4} /></span>
          <span>ToolGym</span>
        </a>
        <div className="topbar-status">
          <span className="status-dot" />
          deterministic grader v1
        </div>
        {apiKey ? (
          <button className="icon-button" type="button" onClick={resetWorkspace} title="Disconnect this browser" aria-label="Disconnect this browser">
            <LogOut size={18} />
          </button>
        ) : null}
      </header>

      <aside className="sidebar" aria-label="ToolGym sections">
        <a className="nav-item active" href="#overview"><CircleGauge size={18} /><span>Overview</span></a>
        <a className="nav-item" href="#workouts"><Dumbbell size={18} /><span>Workouts</span></a>
        <a className="nav-item" href="#field-test"><ClipboardCheck size={18} /><span>Field test</span></a>
        <a className="nav-item" href="#credentials"><FileCheck2 size={18} /><span>Credentials</span></a>
        <div className="sidebar-foot">
          <ShieldCheck size={17} />
          <span>Proof, not promises.</span>
        </div>
      </aside>

      <main className="main" id="top">
        {!apiKey ? (
          <section className="onboarding-layout" aria-labelledby="setup-title">
            <div className="onboarding-copy">
              <p className="eyebrow">Agent qualification workspace</p>
              <h1 id="setup-title">Train tools.<br />Prove mastery.</h1>
              <p className="lede">Register one agent, run four deterministic workouts, then submit real work for independent review.</p>
              <div className="evidence-strip">
                <span><Braces size={17} /> Versioned tests</span>
                <span><LockKeyhole size={17} /> Private key</span>
                <span><FileCheck2 size={17} /> Portable proof</span>
              </div>
            </div>
            <form className="setup-panel" onSubmit={onboard}>
              <div className="panel-heading">
                <span className="step-number">01</span>
                <div><h2>Register a candidate</h2><p>The API key stays in this browser.</p></div>
              </div>
              <label>Workspace name<input value={setup.workspaceName} onChange={(event) => setSetup({ ...setup, workspaceName: event.target.value })} required /></label>
              <label>Agent name<input value={setup.agentName} onChange={(event) => setSetup({ ...setup, agentName: event.target.value })} placeholder="e.g. ZOL" required /></label>
              <fieldset>
                <legend>Adapter</legend>
                <div className="segmented">
                  {["mcp", "openapi", "cli", "webhook"].map((type) => (
                    <button className={setup.adapterType === type ? "selected" : ""} type="button" key={type} onClick={() => setSetup({ ...setup, adapterType: type })}>{type.toUpperCase()}</button>
                  ))}
                </div>
              </fieldset>
              <label>Adapter label<input value={setup.adapterLabel} onChange={(event) => setSetup({ ...setup, adapterLabel: event.target.value })} placeholder="e.g. local MCP gateway" required /></label>
              <label>Tool or skill target<input value={setup.toolTarget} onChange={(event) => setSetup({ ...setup, toolTarget: event.target.value })} placeholder="e.g. GitHub operations" required /></label>
              <button className="primary-button" type="submit" disabled={busy}><Play size={17} fill="currentColor" />{busy ? "Preparing..." : "Open the gym"}</button>
            </form>
          </section>
        ) : (
          <>
            <section className="overview" id="overview">
              <div>
                <p className="eyebrow">Current candidate</p>
                <h1>{currentAgent?.name ?? "Loading candidate"}</h1>
                <p className="lede compact">{currentAgent ? `${currentAgent.tool_target} via ${currentAgent.adapter_label}` : "Restoring your workspace..."}</p>
              </div>
              <button className="secondary-button" type="button" onClick={() => refreshDashboard()} disabled={busy}>
                <RefreshCw size={17} /> Refresh evidence
              </button>
            </section>

            <section className="path-rail" aria-label="Qualification path">
              {pathStatus.map((step, index) => (
                <div className={`path-step ${step.done ? "done" : ""}`} key={step.label}>
                  <span>{step.done ? <Check size={15} /> : index + 1}</span>
                  <strong>{step.label}</strong>
                  {index < pathStatus.length - 1 ? <ChevronRight className="path-arrow" size={16} /> : null}
                </div>
              ))}
            </section>

            <section className="metric-row">
              <div className="metric"><span>Workouts passed</span><strong>{dashboard?.qualification.passedExerciseIds.length ?? 0}<small>/4</small></strong></div>
              <div className="metric"><span>Evidence receipts</span><strong>{dashboard?.attempts.length ?? 0}</strong></div>
              <div className="metric"><span>Field status</span><strong className="metric-word">{dashboard?.qualification.qualified ? "Eligible" : "Training"}</strong></div>
              <div className="metric accent"><span>Mastery credentials</span><strong>{dashboard?.credentials.length ?? 0}</strong></div>
            </section>

            <section className="workout-section" id="workouts">
              <div className="section-heading">
                <div><p className="eyebrow">Core circuit</p><h2>Workouts</h2></div>
                <p>Each result is graded against a fixed, versioned answer contract.</p>
              </div>
              <div className="workout-grid">
                <div className="workout-list" role="tablist" aria-label="Available workouts">
                  {exercises.map((exercise, index) => {
                    const attempt = latestAttempts.get(exercise.id);
                    return (
                      <button
                        className={`workout-tab ${selected?.id === exercise.id ? "active" : ""}`}
                        type="button"
                        role="tab"
                        aria-selected={selected?.id === exercise.id}
                        key={exercise.id}
                        onClick={() => selectExercise(exercise)}
                      >
                        <span className={`workout-index lane-${exercise.lane}`}>{String(index + 1).padStart(2, "0")}</span>
                        <span><strong>{exercise.title}</strong><small>{exercise.estimatedMinutes} min · level {exercise.difficulty}</small></span>
                        {attempt ? <span className={`score-chip ${attempt.passed ? "passed" : "failed"}`}>{attempt.score}%</span> : <ChevronRight size={17} />}
                      </button>
                    );
                  })}
                </div>

                {selected ? (
                  <div className="workout-console" role="tabpanel">
                    <div className="console-head">
                      <div><span className={`lane-tag lane-${selected.lane}`}>{selected.lane}</span><h3>{selected.title}</h3><p>{selected.summary}</p></div>
                      <button className="icon-button light" type="button" title="Copy workout packet" aria-label="Copy workout packet" onClick={() => copy(pretty({ exercise: selected }), "Workout packet copied.")}><Copy size={18} /></button>
                    </div>
                    <div className="packet-block">
                      <div className="code-label"><span>WORKOUT PACKET</span><span>v{selected.version}</span></div>
                      <pre>{pretty(selected.packet)}</pre>
                    </div>
                    <label className="output-label">Agent output<textarea spellCheck={false} value={submission} onChange={(event) => setSubmission(event.target.value)} /></label>
                    <div className="console-actions">
                      <span>Pass score {selected.passScore}%</span>
                      <button className="primary-button compact-button" type="button" onClick={submitWorkout} disabled={busy}><Play size={16} fill="currentColor" /> Grade attempt</button>
                    </div>
                  </div>
                ) : null}

                <aside className="receipt-stack" aria-label="Latest evidence receipts">
                  <div className="receipt-heading"><FileCheck2 size={18} /><h3>Evidence stack</h3></div>
                  {(dashboard?.attempts ?? []).slice(0, 5).map((attempt) => (
                    <a className="receipt-row" href={`/api/receipts/${attempt.id}`} target="_blank" rel="noreferrer" key={attempt.id}>
                      <span className={attempt.passed ? "receipt-status good" : "receipt-status bad"}>{attempt.passed ? <Check size={13} /> : "×"}</span>
                      <span><strong>{exercises.find((exercise) => exercise.id === attempt.exercise_id)?.title ?? attempt.exercise_id}</strong><small>{attempt.evidence_hash.slice(0, 14)}...</small></span>
                      <ExternalLink size={14} />
                    </a>
                  ))}
                  {(dashboard?.attempts.length ?? 0) === 0 ? <div className="empty-state"><Bot size={25} /><p>Receipts appear after the first graded attempt.</p></div> : null}
                </aside>
              </div>
            </section>

            <section className="field-section" id="field-test">
              <div className="field-copy">
                <p className="eyebrow">Independent validation</p>
                <h2>Field test</h2>
                <p>A qualifying agent completes authorized real work. A separate human reviews the evidence before mastery is issued.</p>
                <div className={`eligibility ${dashboard?.qualification.qualified ? "unlocked" : ""}`}>
                  {dashboard?.qualification.qualified ? <ShieldCheck size={20} /> : <LockKeyhole size={20} />}
                  <span>{dashboard?.qualification.qualified ? "Field test unlocked" : `Pass ${4 - (dashboard?.qualification.passedExerciseIds.length ?? 0)} more workout(s)`}</span>
                </div>
              </div>
              <form className="field-form" onSubmit={requestFieldTest}>
                <label>Real task summary<textarea value={fieldTest.taskSummary} onChange={(event) => setFieldTest({ ...fieldTest, taskSummary: event.target.value })} placeholder="Describe the authorized task and expected result." required disabled={!dashboard?.qualification.qualified} /></label>
                <div className="two-col">
                  <label>Evidence URL<input type="url" value={fieldTest.evidenceUrl} onChange={(event) => setFieldTest({ ...fieldTest, evidenceUrl: event.target.value })} placeholder="https://..." required disabled={!dashboard?.qualification.qualified} /></label>
                  <label>Environment<input value={fieldTest.environmentLabel} onChange={(event) => setFieldTest({ ...fieldTest, environmentLabel: event.target.value })} placeholder="GitHub sandbox, July 2026" required disabled={!dashboard?.qualification.qualified} /></label>
                </div>
                <label className="attestation-control">
                  <input type="checkbox" checked={fieldTest.confirmPublicEvidence} onChange={(event) => setFieldTest({ ...fieldTest, confirmPublicEvidence: event.target.checked })} required disabled={!dashboard?.qualification.qualified} />
                  <span>I confirm this evidence is public, authorized to share, and contains no credentials, private prompts, or customer secrets.</span>
                </label>
                <button className="primary-button" type="submit" disabled={busy || !dashboard?.qualification.qualified}><ClipboardCheck size={17} /> Request proctor review</button>
                {reviewUrl ? (
                  <div className="review-link"><input readOnly value={reviewUrl} /><button className="icon-button light" type="button" onClick={() => copy(reviewUrl, "Private proctor link copied.")} title="Copy private proctor link" aria-label="Copy private proctor link"><Copy size={17} /></button></div>
                ) : null}
              </form>
            </section>

            <section className="credentials-section" id="credentials">
              <div className="section-heading"><div><p className="eyebrow">Portable record</p><h2>Credentials</h2></div><p>Credentials expire after 180 days so mastery stays current.</p></div>
              <div className="credential-list">
                {(dashboard?.credentials ?? []).map((credential) => (
                  <a className="credential-card" href={`/verify/${credential.id}`} key={credential.id}>
                    <span className="credential-seal"><ShieldCheck size={24} /></span>
                    <span><small>AGENT TOOL MASTERY</small><strong>{currentAgent?.tool_target}</strong><em>{credential.status.replaceAll("_", " ")}</em></span>
                    <ChevronRight size={19} />
                  </a>
                ))}
                {(dashboard?.credentials.length ?? 0) === 0 ? <div className="credential-empty"><KeyRound size={23} /><p>No mastery credential yet. Qualification alone does not issue one.</p></div> : null}
              </div>
            </section>
          </>
        )}

        {notice ? <div className={`toast ${notice.tone}`} role="status"><span>{notice.tone === "good" ? <Check size={16} /> : notice.tone === "bad" ? "!" : "i"}</span>{notice.message}</div> : null}
      </main>
    </div>
  );
}
