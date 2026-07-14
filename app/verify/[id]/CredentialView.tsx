"use client";

import { useEffect, useState } from "react";
import { ExternalLink, FileCheck2, ShieldCheck } from "lucide-react";

type CredentialResponse = {
  credential: {
    id: string;
    validFrom: string;
    validUntil: string;
    credentialSubject: {
      name: string;
      adapter: string;
      achievement: { name: string; level: string; criteriaVersion: string };
    };
    evidence: {
      workoutReceipts: Array<{ id: string; exerciseId: string; version: string; score: number; hash: string }>;
      fieldExam: { taskSummary: string; evidenceUrl: string; environment: string; reviewer: string; reviewedAt: string };
    };
  };
  proof: { type: string; proofValue?: string; digest?: string };
  verification: { status: string; hashValid: boolean; signatureValid: boolean; expired: boolean; checkedAt: string };
};

export default function CredentialView({ id }: { id: string }) {
  const [data, setData] = useState<CredentialResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/credentials/${id}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(((await response.json()) as { error?: string }).error ?? "Credential not found.");
        return response.json() as Promise<CredentialResponse>;
      })
      .then(setData)
      .catch((reason: Error) => setError(reason.message));
  }, [id]);

  const verified = data?.verification.status === "verified";
  return (
    <main className="public-page">
      <section className="public-panel">
        <header className="public-panel-head">
          <span className="public-icon"><ShieldCheck size={24} /></span>
          <div><p className="eyebrow">Credential verification</p><h1>{data?.credential.credentialSubject.name ?? "Agent mastery"}</h1><p>ToolGym checks the evidence digest, issuer signature, and expiration.</p></div>
        </header>
        <div className="public-panel-body">
          {error ? <div className="verification-banner hash-only">{error}</div> : null}
          {data ? (
            <>
              <div className={`verification-banner ${verified ? "" : "hash-only"}`}>
                {verified ? <ShieldCheck size={22} /> : <FileCheck2 size={22} />}
                <div><strong>{verified ? "Issuer signature verified" : data.verification.status === "hash_only" ? "Evidence hash verified; issuer signature unavailable" : "Credential is not valid"}</strong><br /><small>Checked {new Date(data.verification.checkedAt).toLocaleString()}</small></div>
              </div>
              <div className="review-facts">
                <div className="review-fact"><span>Achievement</span><strong>{data.credential.credentialSubject.achievement.name}</strong></div>
                <div className="review-fact"><span>Level</span><strong>{data.credential.credentialSubject.achievement.level.replaceAll("-", " ")}</strong></div>
                <div className="review-fact"><span>Valid until</span><strong>{new Date(data.credential.validUntil).toLocaleDateString()}</strong></div>
                <div className="review-fact"><span>Reviewer</span><strong>{data.credential.evidence.fieldExam.reviewer}</strong></div>
              </div>
              <h3>Workout evidence</h3>
              <div className="review-workouts">
                {data.credential.evidence.workoutReceipts.map((receipt) => (
                  <a className="review-workout" href={`/api/receipts/${receipt.id}`} target="_blank" rel="noreferrer" key={receipt.id}>
                    <span><ShieldCheck size={13} /></span><strong>{receipt.exerciseId}</strong><span>{receipt.score}% · v{receipt.version}</span>
                  </a>
                ))}
              </div>
              <h3>Field evidence</h3>
              <p>{data.credential.evidence.fieldExam.taskSummary}</p>
              <a className="evidence-link" href={data.credential.evidence.fieldExam.evidenceUrl} target="_blank" rel="noreferrer">Inspect original evidence <ExternalLink size={15} /></a>
              <h3 style={{ marginTop: 24 }}>Portable record</h3>
              <pre className="credential-json">{JSON.stringify(data, null, 2)}</pre>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}
