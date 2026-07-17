"use client";

import { useEffect, useState } from "react";
import { Check, ClipboardCheck, ExternalLink, ShieldCheck, X } from "lucide-react";

type ReviewData = {
  fieldExam: {
    id: string;
    taskSummary: string;
    evidenceUrl: string;
    environmentLabel: string;
    status: string;
    createdAt: string;
    reviewerName: string | null;
    reviewerNotes: string | null;
  };
  agent: { id: string; name: string; adapterType: string; adapterLabel: string; toolTarget: string };
  workouts: Array<{ exerciseId: string; title: string; version: string; score: number; evidenceHash: string; passed: boolean }>;
  simulations: Array<{ labId: string; title: string; version: string; score: number; evidenceHash: string; passed: boolean }>;
};

export default function ProctorReview({ token }: { token: string }) {
  const [data, setData] = useState<ReviewData | null>(null);
  const [reviewerName, setReviewerName] = useState("");
  const [notes, setNotes] = useState("");
  const [attestIndependent, setAttestIndependent] = useState(false);
  const [message, setMessage] = useState("Loading review packet...");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/proctor/${token}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(((await response.json()) as { error?: string }).error ?? "Review request not found.");
        return response.json() as Promise<ReviewData>;
      })
      .then((value) => {
        setData(value);
        setMessage("");
      })
      .catch((error: Error) => setMessage(error.message));
  }, [token]);

  async function decide(decision: "approved" | "rejected") {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/proctor/${token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, reviewerName, notes, attestIndependent }),
      });
      const result = (await response.json()) as { error?: string; credential?: { verifyUrl: string } };
      if (!response.ok) throw new Error(result.error ?? "Review could not be saved.");
      if (result.credential) {
        window.location.href = result.credential.verifyUrl;
        return;
      }
      setMessage("Field test rejected. The decision is recorded.");
      setData((current) => current ? { ...current, fieldExam: { ...current.fieldExam, status: "rejected", reviewerName, reviewerNotes: notes } } : current);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Review failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="public-page">
      <section className="public-panel">
        <header className="public-panel-head">
          <span className="public-icon"><ClipboardCheck size={24} /></span>
          <div><p className="eyebrow">Independent field review</p><h1>{data?.agent.name ?? "ToolGym field test"}</h1><p>Approval creates a six-month tool-mastery credential.</p></div>
        </header>
        <div className="public-panel-body">
          {message ? <div className="verification-banner hash-only">{message}</div> : null}
          {data ? (
            <>
              <div className="review-facts">
                <div className="review-fact"><span>Tool target</span><strong>{data.agent.toolTarget}</strong></div>
                <div className="review-fact"><span>Adapter</span><strong>{data.agent.adapterType.toUpperCase()} · {data.agent.adapterLabel}</strong></div>
                <div className="review-fact"><span>Environment</span><strong>{data.fieldExam.environmentLabel}</strong></div>
                <div className="review-fact"><span>Status</span><strong>{data.fieldExam.status.replaceAll("_", " ")}</strong></div>
              </div>
              <h3>Real task</h3>
              <p>{data.fieldExam.taskSummary}</p>
              <a className="evidence-link" href={data.fieldExam.evidenceUrl} target="_blank" rel="noreferrer">Open submitted evidence <ExternalLink size={15} /></a>
              <div className="review-workouts">
                {data.workouts.map((workout) => (
                  <div className="review-workout" key={workout.exerciseId}>
                    <span><Check size={13} /></span><strong>{workout.title}</strong><span>{workout.score}% · v{workout.version}</span>
                  </div>
                ))}
                {data.simulations.map((simulation) => (
                  <div className="review-workout" key={simulation.labId}>
                    <span><Check size={13} /></span><strong>{simulation.title}</strong><span>{simulation.score}% · simulation v{simulation.version}</span>
                  </div>
                ))}
              </div>
              {data.fieldExam.status === "pending_review" ? (
                <>
                  <label>Your name<input value={reviewerName} onChange={(event) => setReviewerName(event.target.value)} required /></label>
                  <label>Review notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Describe what you inspected and why the evidence passes or fails." required /></label>
                  <label className="attestation-control">
                    <input type="checkbox" checked={attestIndependent} onChange={(event) => setAttestIndependent(event.target.checked)} required />
                    <span>I independently inspected the evidence, had no role in producing it, and am recording my own judgment.</span>
                  </label>
                  <div className="review-actions">
                    <button className="reject-button" type="button" disabled={busy || reviewerName.trim().length < 2 || notes.trim().length < 10 || !attestIndependent} onClick={() => decide("rejected")}><X size={16} /> Reject evidence</button>
                    <button className="primary-button" type="button" disabled={busy || reviewerName.trim().length < 2 || notes.trim().length < 10 || !attestIndependent} onClick={() => decide("approved")}><ShieldCheck size={17} /> Approve mastery</button>
                  </div>
                </>
              ) : (
                <div className={`verification-banner ${data.fieldExam.status === "rejected" ? "hash-only" : ""}`}>
                  {data.fieldExam.status === "approved" ? <ShieldCheck size={20} /> : <X size={20} />}
                  Reviewed by {data.fieldExam.reviewerName ?? "an independent proctor"}.
                </div>
              )}
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}
