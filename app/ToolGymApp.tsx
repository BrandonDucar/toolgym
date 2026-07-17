"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bot,
  Braces,
  Cable,
  Check,
  ChevronRight,
  CircleGauge,
  ClipboardCheck,
  Copy,
  Dumbbell,
  ExternalLink,
  FileCheck2,
  FlaskConical,
  KeyRound,
  LockKeyhole,
  LogOut,
  Play,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { ADAPTERS, CUSTOM_TOOL_TARGET_ID, TOOL_TARGETS, type AdapterId } from "@/lib/gateway";

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

type SimulationLab = {
  id: string;
  version: string;
  title: string;
  summary: string;
  difficulty: number;
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
    agent_id: string;
    exercise_id: string;
    exercise_version: string;
    score: number;
    passed: boolean;
    evidence_hash: string;
    created_at: string;
  }>;
  labAttempts: Array<{
    id: string;
    agent_id: string;
    lab_id: string;
    lab_version: string;
    score: number;
    passed: boolean;
    evidence_hash: string;
    created_at: string;
  }>;
  fieldExams: Array<{
    id: string;
    agent_id: string;
    task_summary: string;
    evidence_url: string;
    status: string;
    reviewer_name: string | null;
    created_at: string;
  }>;
  credentials: Array<{
    id: string;
    agent_id: string;
    status: string;
    payload_hash: string;
    issued_at: string;
    expires_at: string;
  }>;
  qualifications: Record<string, {
    passedExerciseIds: string[];
    passedLabIds: string[];
    coreQualified: boolean;
    simulationQualified: boolean;
    fieldEligible: boolean;
  }>;
  qualification: { passedExerciseIds: string[]; qualified: boolean };
};

const STORAGE_KEY = "toolgym_api_key";
const DEFAULT_ADAPTER = ADAPTERS[0];
const DEFAULT_TOOL_TARGET = TOOL_TARGETS[0];

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
  const [labs, setLabs] = useState<SimulationLab[]>([]);
  const [selectedId, setSelectedId] = useState("tool-selection");
  const [selectedLabId, setSelectedLabId] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [submission, setSubmission] = useState("");
  const [labSubmission, setLabSubmission] = useState("");
  const [notice, setNotice] = useState<{ tone: "good" | "bad" | "info"; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [reviewUrl, setReviewUrl] = useState("");
  const [restoreKey, setRestoreKey] = useState("");
  const [setup, setSetup] = useState({
    workspaceName: "My agent lab",
    agentName: "",
    adapterType: DEFAULT_ADAPTER.id as AdapterId,
    adapterLabel: DEFAULT_ADAPTER.suggestedLabel,
    toolTargetId: DEFAULT_TOOL_TARGET.id as string,
    customToolTarget: "",
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
      try {
        const response = await fetch("/api/labs");
        if (!response.ok) throw new Error("Lab catalog request failed");
        const data = (await response.json()) as { labs: SimulationLab[] };
        if (!active) return;
        setLabs(data.labs);
        if (data.labs[0]) {
          setSelectedLabId(data.labs[0].id);
          setLabSubmission(pretty(data.labs[0].responseShape));
        }
      } catch {
        if (active) setNotice({ tone: "bad", message: "The simulation lab catalog is unavailable." });
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
  const selectedLab = useMemo(() => labs.find((lab) => lab.id === selectedLabId) ?? labs[0], [labs, selectedLabId]);
  const currentAgent = dashboard?.agents.find((agent) => agent.id === selectedAgentId) ?? dashboard?.agents[0];
  const currentQualification = currentAgent ? dashboard?.qualifications[currentAgent.id] : undefined;
  const selectedAdapter = ADAPTERS.find((adapter) => adapter.id === setup.adapterType) ?? DEFAULT_ADAPTER;
  const selectedTarget = TOOL_TARGETS.find((target) => target.id === setup.toolTargetId) ?? DEFAULT_TOOL_TARGET;
  const candidateAttempts = useMemo(
    () => (dashboard?.attempts ?? []).filter((attempt) => attempt.agent_id === currentAgent?.id),
    [dashboard, currentAgent?.id],
  );
  const candidateLabAttempts = useMemo(
    () => (dashboard?.labAttempts ?? []).filter((attempt) => attempt.agent_id === currentAgent?.id),
    [dashboard, currentAgent?.id],
  );
  const candidateFieldExams = useMemo(
    () => (dashboard?.fieldExams ?? []).filter((exam) => exam.agent_id === currentAgent?.id),
    [dashboard, currentAgent?.id],
  );
  const candidateCredentials = useMemo(
    () => (dashboard?.credentials ?? []).filter((credential) => credential.agent_id === currentAgent?.id),
    [dashboard, currentAgent?.id],
  );
  const latestAttempts = useMemo(() => {
    const map = new Map<string, Dashboard["attempts"][number]>();
    for (const attempt of candidateAttempts) if (!map.has(attempt.exercise_id)) map.set(attempt.exercise_id, attempt);
    return map;
  }, [candidateAttempts]);

  function selectExercise(exercise: Exercise) {
    setSelectedId(exercise.id);
    setSubmission(pretty(exercise.responseShape));
  }

  function selectLab(lab: SimulationLab) {
    setSelectedLabId(lab.id);
    setLabSubmission(pretty(lab.responseShape));
  }

  function selectAdapter(adapterType: AdapterId) {
    const current = ADAPTERS.find((adapter) => adapter.id === setup.adapterType) ?? DEFAULT_ADAPTER;
    const next = ADAPTERS.find((adapter) => adapter.id === adapterType) ?? DEFAULT_ADAPTER;
    setSetup((value) => ({
      ...value,
      adapterType,
      adapterLabel: !value.adapterLabel || value.adapterLabel === current.suggestedLabel ? next.suggestedLabel : value.adapterLabel,
    }));
  }

  async function onboard(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const toolTarget = setup.toolTargetId === CUSTOM_TOOL_TARGET_ID ? setup.customToolTarget.trim() : selectedTarget.label;
      if (!toolTarget) throw new Error("Describe the custom tool or skill your agent will train on.");
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
          toolTarget,
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

  function restoreWorkspace(event: React.FormEvent) {
    event.preventDefault();
    const key = restoreKey.trim();
    if (!key) return;
    window.localStorage.setItem(STORAGE_KEY, key);
    setDashboard(null);
    setApiKey(key);
    setNotice({ tone: "info", message: "Checking the saved workspace key..." });
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

  async function submitSimulationLab() {
    if (!selectedLab || !currentAgent || !currentQualification?.coreQualified) return;
    setBusy(true);
    setNotice(null);
    try {
      const parsed = JSON.parse(labSubmission);
      const response = await authFetch("/api/lab-attempts", {
        method: "POST",
        body: JSON.stringify({ agentId: currentAgent.id, labId: selectedLab.id, response: parsed }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as { grade: { score: number; passed: boolean }; receipt: { id: string } };
      setNotice({
        tone: data.grade.passed ? "good" : "bad",
        message: data.grade.passed
          ? `Simulation passed at ${data.grade.score}%. Receipt ${data.receipt.id.slice(0, 8)} issued.`
          : `Simulation scored ${data.grade.score}%. The receipt is preserved; revise the response and run a new attempt.`,
      });
      await refreshDashboard();
    } catch (error) {
      setNotice({ tone: "bad", message: error instanceof Error ? error.message : "Simulation submission failed." });
    } finally {
      setBusy(false);
    }
  }

  async function copyConnectionPacket() {
    if (!currentAgent) return;
    await copy(
      pretty({
        schema: "toolgym-agent-connection/v1",
        baseUrl: window.location.origin,
        authentication: { type: "bearer", apiKey },
        candidate: { id: currentAgent.id, name: currentAgent.name },
        adapter: { type: currentAgent.adapter_type, label: currentAgent.adapter_label },
        target: currentAgent.tool_target,
        endpoints: {
          workouts: "/api/exercises",
          attempts: "/api/attempts",
          simulationLabs: "/api/labs",
          simulationAttempts: "/api/lab-attempts",
          dashboard: "/api/dashboard",
          fieldExams: "/api/field-exams",
        },
      }),
      "Private connection packet copied. Do not post it publicly.",
    );
  }

  async function copyAgentInstructions() {
    if (!currentAgent) return;
    await copy(
      `You are training in ToolGym as ${currentAgent.name}. Read the public workout catalog at ${window.location.origin}/api/exercises. Complete each packet using only authorized tools and return JSON matching responseShape. After the core workouts pass, read ${window.location.origin}/api/labs and complete one applied simulation. Submit only through the private connection packet provided by your operator. Never expose the ToolGym bearer key, model credentials, private prompts, or customer data. Treat approval-required and out-of-scope actions as blocked. Failed attempts remain part of the evidence record; do not claim success unless the receipt says passed.`,
      "Agent instructions copied.",
    );
  }

  const pathStatus = [
    { label: "Connect", done: Boolean(currentAgent) },
    { label: "Workouts", done: Boolean(currentQualification?.coreQualified) },
    { label: "Simulation", done: Boolean(currentQualification?.simulationQualified) },
    { label: "Field test", done: candidateFieldExams.some((exam) => exam.status === "approved") },
    { label: "Credential", done: candidateCredentials.length > 0 },
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
        <a className="nav-item" href="#simulation-labs"><FlaskConical size={18} /><span>Simulation labs</span></a>
        <a className="nav-item" href="#agent-gateway"><Cable size={18} /><span>Agent gateway</span></a>
        <a className="nav-item" href="#field-test"><ClipboardCheck size={18} /><span>Field test</span></a>
        <a className="nav-item" href="#credentials"><FileCheck2 size={18} /><span>Credentials</span></a>
        <div className="sidebar-foot">
          <ShieldCheck size={17} />
          <span>Proof, not promises.</span>
        </div>
      </aside>

      <main className="main" id="top">
        {!apiKey ? (
          <>
          <section className="onboarding-layout" aria-labelledby="setup-title">
            <div className="onboarding-copy" id="overview">
              <p className="eyebrow">Agent qualification workspace</p>
              <h1 id="setup-title">Train tools.<br />Prove mastery.</h1>
              <p className="lede">Register one agent, pass deterministic workouts and a simulation lab, then submit bounded real work for independent review.</p>
              <div className="evidence-strip">
                <span><Braces size={17} /> Versioned tests</span>
                <span><LockKeyhole size={17} /> Private key</span>
                <span><FileCheck2 size={17} /> Portable proof</span>
              </div>
            </div>
            <div className="setup-column">
            <form className="setup-panel" onSubmit={onboard}>
              <div className="panel-heading">
                <span className="step-number">01</span>
                <div><h2>Register a candidate</h2><p>The API key stays in this browser.</p></div>
              </div>
              <label><span>Workspace name</span><input value={setup.workspaceName} onChange={(event) => setSetup({ ...setup, workspaceName: event.target.value })} required /><small className="field-help">A private label for this agent and its evidence history.</small></label>
              <label><span>Agent name</span><input value={setup.agentName} onChange={(event) => setSetup({ ...setup, agentName: event.target.value })} placeholder="e.g. ZOL" required /><small className="field-help">The candidate that will perform the workouts. Any model or runtime can participate.</small></label>
              <fieldset>
                <legend>Connection adapter</legend>
                <div className="segmented">
                  {ADAPTERS.map((adapter) => (
                    <button className={setup.adapterType === adapter.id ? "selected" : ""} type="button" key={adapter.id} onClick={() => selectAdapter(adapter.id)}>{adapter.label}</button>
                  ))}
                </div>
                <div className="adapter-explainer"><Cable size={16} /><span><strong>{selectedAdapter.label}</strong>{selectedAdapter.description}</span></div>
              </fieldset>
              <label><span>Adapter label</span><input value={setup.adapterLabel} onChange={(event) => setSetup({ ...setup, adapterLabel: event.target.value })} placeholder={selectedAdapter.suggestedLabel} required /><small className="field-help">A human-readable name for the exact connection your agent uses, such as “ZOL local MCP.”</small></label>
              <label><span>Tool or skill target</span><select value={setup.toolTargetId} onChange={(event) => setSetup({ ...setup, toolTargetId: event.target.value })}>{TOOL_TARGETS.map((target) => <option key={target.id} value={target.id}>{target.label}</option>)}</select><small className="field-help">{selectedTarget.description}</small></label>
              {setup.toolTargetId === CUSTOM_TOOL_TARGET_ID ? <label><span>Custom target</span><input value={setup.customToolTarget} onChange={(event) => setSetup({ ...setup, customToolTarget: event.target.value })} placeholder="e.g. Farcaster channel moderation" required /><small className="field-help">Name one bounded capability so the credential remains specific and meaningful.</small></label> : null}
              <button className="primary-button" type="submit" disabled={busy}><Play size={17} fill="currentColor" />{busy ? "Preparing..." : "Open the gym"}</button>
            </form>
            <form className="restore-panel" onSubmit={restoreWorkspace}>
              <div><KeyRound size={18} /><span><strong>Returning to a workspace?</strong><small>Paste the ToolGym key saved when it was created.</small></span></div>
              <div className="restore-control"><input type="password" value={restoreKey} onChange={(event) => setRestoreKey(event.target.value)} placeholder="tg_live_..." aria-label="Existing ToolGym API key" required /><button className="secondary-button" type="submit">Reconnect</button></div>
            </form>
            </div>
          </section>
          <section className="onboarding-roadmap" aria-labelledby="roadmap-title">
            <div className="section-heading"><div><p className="eyebrow">First session</p><h2 id="roadmap-title">What happens next</h2></div><p>Your agent stays in your environment. ToolGym receives structured answers and public evidence, never provider credentials.</p></div>
            <div className="roadmap-grid">
              <div className="roadmap-item" id="workouts"><span>02</span><Dumbbell size={20} /><div><strong>Run workouts</strong><p>Copy a versioned packet into your agent, then grade its structured response.</p></div></div>
              <div className="roadmap-item" id="simulation-labs"><span>03</span><FlaskConical size={20} /><div><strong>Pass a simulation</strong><p>Solve a realistic task packet that combines planning, safety, recovery, and proof.</p></div></div>
              <div className="roadmap-item" id="agent-gateway"><span>04</span><Cable size={20} /><div><strong>Connect the gateway</strong><p>Give your agent a private connection packet for API or CLI-driven training.</p></div></div>
              <div className="roadmap-item" id="field-test"><span>05</span><ClipboardCheck size={20} /><div><strong>Complete field work</strong><p>Submit authorized real-world evidence after training and simulation pass.</p></div></div>
              <div className="roadmap-item" id="credentials"><span>06</span><FileCheck2 size={20} /><div><strong>Publish mastery</strong><p>An independent proctor approves a portable, expiring credential.</p></div></div>
            </div>
          </section>
          </>
        ) : (
          <>
            <section className="overview" id="overview">
              <div>
                <p className="eyebrow">Current candidate</p>
                <h1>{currentAgent?.name ?? "Loading candidate"}</h1>
                <p className="lede compact">{currentAgent ? `${currentAgent.tool_target} via ${currentAgent.adapter_label}` : "Restoring your workspace..."}</p>
              </div>
              <div className="overview-actions">
                {(dashboard?.agents.length ?? 0) > 1 ? (
                  <label className="candidate-control"><span>Candidate roster</span><select value={currentAgent?.id ?? ""} onChange={(event) => setSelectedAgentId(event.target.value)}>{dashboard?.agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></label>
                ) : null}
                <button className="secondary-button" type="button" onClick={() => refreshDashboard()} disabled={busy}>
                  <RefreshCw size={17} /> Refresh evidence
                </button>
              </div>
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
              <div className="metric"><span>Workouts passed</span><strong>{currentQualification?.passedExerciseIds.length ?? 0}<small>/{exercises.length || 4}</small></strong></div>
              <div className="metric"><span>Simulation labs</span><strong>{currentQualification?.passedLabIds.length ?? 0}<small>/{labs.length || 4}</small></strong></div>
              <div className="metric"><span>Evidence receipts</span><strong>{candidateAttempts.length + candidateLabAttempts.length}</strong></div>
              <div className="metric accent"><span>Mastery credentials</span><strong>{candidateCredentials.length}</strong></div>
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
                  {candidateAttempts.slice(0, 5).map((attempt) => (
                    <a className="receipt-row" href={`/api/receipts/${attempt.id}`} target="_blank" rel="noreferrer" key={attempt.id}>
                      <span className={attempt.passed ? "receipt-status good" : "receipt-status bad"}>{attempt.passed ? <Check size={13} /> : "×"}</span>
                      <span><strong>{exercises.find((exercise) => exercise.id === attempt.exercise_id)?.title ?? attempt.exercise_id}</strong><small>{attempt.evidence_hash.slice(0, 14)}...</small></span>
                      <ExternalLink size={14} />
                    </a>
                  ))}
                  {candidateAttempts.length === 0 ? <div className="empty-state"><Bot size={25} /><p>Receipts appear after the first graded attempt.</p></div> : null}
                </aside>
              </div>
            </section>

            <section className="simulation-section" id="simulation-labs">
              <div className="section-heading">
                <div><p className="eyebrow">Applied qualification</p><h2>Simulation labs</h2></div>
                <p>After the core circuit, the candidate solves one realistic, evidence-bearing task packet before field work unlocks.</p>
              </div>
              <div className={`workout-grid simulation-grid ${currentQualification?.coreQualified ? "" : "locked"}`}>
                <div className="workout-list" role="tablist" aria-label="Available simulation labs">
                  {labs.map((lab, index) => {
                    const attempt = candidateLabAttempts.find((item) => item.lab_id === lab.id);
                    return (
                      <button className={`workout-tab ${selectedLab?.id === lab.id ? "active" : ""}`} type="button" role="tab" aria-selected={selectedLab?.id === lab.id} key={lab.id} onClick={() => selectLab(lab)} disabled={!currentQualification?.coreQualified}>
                        <span className="workout-index lane-simulation">{String(index + 1).padStart(2, "0")}</span>
                        <span><strong>{lab.title}</strong><small>{lab.estimatedMinutes} min · level {lab.difficulty}</small></span>
                        {attempt ? <span className={`score-chip ${attempt.passed ? "passed" : "failed"}`}>{attempt.score}%</span> : <ChevronRight size={17} />}
                      </button>
                    );
                  })}
                </div>

                {selectedLab ? (
                  <div className="workout-console" role="tabpanel">
                    <div className="console-head">
                      <div><span className="lane-tag lane-simulation">simulation</span><h3>{selectedLab.title}</h3><p>{selectedLab.summary}</p></div>
                      <button className="icon-button light" type="button" title="Copy simulation packet" aria-label="Copy simulation packet" onClick={() => copy(pretty({ lab: selectedLab }), "Simulation packet copied.")} disabled={!currentQualification?.coreQualified}><Copy size={18} /></button>
                    </div>
                    {currentQualification?.coreQualified ? (
                      <>
                        <div className="packet-block"><div className="code-label"><span>SIMULATION PACKET</span><span>v{selectedLab.version}</span></div><pre>{pretty(selectedLab.packet)}</pre></div>
                        <label className="output-label">Agent output<textarea spellCheck={false} value={labSubmission} onChange={(event) => setLabSubmission(event.target.value)} /></label>
                        <div className="console-actions"><span>Pass score {selectedLab.passScore}%</span><button className="primary-button compact-button" type="button" onClick={submitSimulationLab} disabled={busy}><Play size={16} fill="currentColor" /> Grade simulation</button></div>
                      </>
                    ) : <div className="simulation-lock"><LockKeyhole size={26} /><div><strong>Core circuit required</strong><p>Pass every workout as this candidate to open applied simulations.</p></div></div>}
                  </div>
                ) : null}

                <aside className="receipt-stack" aria-label="Simulation receipts">
                  <div className="receipt-heading"><FlaskConical size={18} /><h3>Lab evidence</h3></div>
                  {candidateLabAttempts.slice(0, 5).map((attempt) => (
                    <a className="receipt-row" href={`/api/lab-receipts/${attempt.id}`} target="_blank" rel="noreferrer" key={attempt.id}>
                      <span className={attempt.passed ? "receipt-status good" : "receipt-status bad"}>{attempt.passed ? <Check size={13} /> : "×"}</span>
                      <span><strong>{labs.find((lab) => lab.id === attempt.lab_id)?.title ?? attempt.lab_id}</strong><small>{attempt.evidence_hash.slice(0, 14)}...</small></span><ExternalLink size={14} />
                    </a>
                  ))}
                  {candidateLabAttempts.length === 0 ? <div className="empty-state"><FlaskConical size={25} /><p>Complete the core circuit to begin simulation work.</p></div> : null}
                </aside>
              </div>
            </section>

            <section className="gateway-section" id="agent-gateway">
              <div className="section-heading">
                <div><p className="eyebrow">Bring your own agent</p><h2>Agent gateway</h2></div>
                <p>Connect the candidate without giving ToolGym access to its model account, private memory, or tool credentials.</p>
              </div>
              <div className="gateway-grid">
                <div className="gateway-fact"><span>Connection</span><strong>{currentAgent?.adapter_type.toUpperCase()}</strong><small>{currentAgent?.adapter_label}</small></div>
                <div className="gateway-fact"><span>Candidate ID</span><strong className="mono-value">{currentAgent?.id ?? "Loading..."}</strong><small>Use this ID on attempt submissions.</small></div>
                <div className="gateway-fact"><span>ToolGym key</span><strong className="mono-value">{apiKey ? `${apiKey.slice(0, 10)}...${apiKey.slice(-4)}` : "Unavailable"}</strong><small>Private bearer key; the server stores only its hash.</small></div>
              </div>
              <div className="gateway-actions">
                <button className="primary-button" type="button" onClick={copyConnectionPacket} disabled={!currentAgent}><Copy size={17} /> Copy private connection packet</button>
                <button className="secondary-button" type="button" onClick={copyAgentInstructions} disabled={!currentAgent}><Bot size={17} /> Copy agent instructions</button>
                <a className="gateway-link" href="/api/gateway" target="_blank" rel="noreferrer">View public gateway manifest <ExternalLink size={15} /></a>
              </div>
              <p className="gateway-privacy"><ShieldCheck size={17} /><span>Keep the connection packet private. It contains only the ToolGym workspace key and candidate routing details; your model and application secrets stay with you.</span></p>
            </section>

            <section className="field-section" id="field-test">
              <div className="field-copy">
                <p className="eyebrow">Independent validation</p>
                <h2>Field test</h2>
                <p>A qualifying agent completes authorized real work. A separate human reviews the evidence before mastery is issued.</p>
                <div className={`eligibility ${currentQualification?.fieldEligible ? "unlocked" : ""}`}>
                  {currentQualification?.fieldEligible ? <ShieldCheck size={20} /> : <LockKeyhole size={20} />}
                  <span>{currentQualification?.fieldEligible ? "Field test unlocked" : currentQualification?.coreQualified ? "Pass one simulation lab" : `Pass ${Math.max(0, exercises.length - (currentQualification?.passedExerciseIds.length ?? 0))} more workout(s)`}</span>
                </div>
              </div>
              <form className="field-form" onSubmit={requestFieldTest}>
                <label>Real task summary<textarea value={fieldTest.taskSummary} onChange={(event) => setFieldTest({ ...fieldTest, taskSummary: event.target.value })} placeholder="Describe the authorized task and expected result." required disabled={!currentQualification?.fieldEligible} /></label>
                <div className="two-col">
                  <label>Evidence URL<input type="url" value={fieldTest.evidenceUrl} onChange={(event) => setFieldTest({ ...fieldTest, evidenceUrl: event.target.value })} placeholder="https://..." required disabled={!currentQualification?.fieldEligible} /></label>
                  <label>Environment<input value={fieldTest.environmentLabel} onChange={(event) => setFieldTest({ ...fieldTest, environmentLabel: event.target.value })} placeholder="GitHub sandbox, July 2026" required disabled={!currentQualification?.fieldEligible} /></label>
                </div>
                <label className="attestation-control">
                  <input type="checkbox" checked={fieldTest.confirmPublicEvidence} onChange={(event) => setFieldTest({ ...fieldTest, confirmPublicEvidence: event.target.checked })} required disabled={!currentQualification?.fieldEligible} />
                  <span>I confirm this evidence is public, authorized to share, and contains no credentials, private prompts, or customer secrets.</span>
                </label>
                <button className="primary-button" type="submit" disabled={busy || !currentQualification?.fieldEligible}><ClipboardCheck size={17} /> Request proctor review</button>
                {reviewUrl ? (
                  <div className="review-link"><input readOnly value={reviewUrl} /><button className="icon-button light" type="button" onClick={() => copy(reviewUrl, "Private proctor link copied.")} title="Copy private proctor link" aria-label="Copy private proctor link"><Copy size={17} /></button></div>
                ) : null}
              </form>
            </section>

            <section className="credentials-section" id="credentials">
              <div className="section-heading"><div><p className="eyebrow">Portable record</p><h2>Credentials</h2></div><p>Credentials expire after 180 days so mastery stays current.</p></div>
              <div className="credential-list">
                {candidateCredentials.map((credential) => (
                  <a className="credential-card" href={`/verify/${credential.id}`} key={credential.id}>
                    <span className="credential-seal"><ShieldCheck size={24} /></span>
                    <span><small>AGENT TOOL MASTERY</small><strong>{currentAgent?.tool_target}</strong><em>{credential.status.replaceAll("_", " ")}</em></span>
                    <ChevronRight size={19} />
                  </a>
                ))}
                {candidateCredentials.length === 0 ? <div className="credential-empty"><KeyRound size={23} /><div><p>No mastery credential yet. Qualification alone does not issue one.</p><a href={currentQualification?.fieldEligible ? "#field-test" : currentQualification?.coreQualified ? "#simulation-labs" : "#workouts"}>{currentQualification?.fieldEligible ? "Submit the field test" : currentQualification?.coreQualified ? "Pass a simulation lab" : "Finish the core workouts"}</a></div></div> : null}
              </div>
            </section>
          </>
        )}

        {notice ? <div className={`toast ${notice.tone}`} role="status"><span>{notice.tone === "good" ? <Check size={16} /> : notice.tone === "bad" ? "!" : "i"}</span>{notice.message}</div> : null}
      </main>
    </div>
  );
}
