import assert from "node:assert/strict";
import test from "node:test";
import { EXERCISES } from "../lib/catalog";
import type { CriterionResult, LabAttemptRecord } from "../lib/contracts";
import {
  LABS,
  buildPublicLabReceipt,
  coreWorkoutQualification,
  fieldExamQualification,
  gradeLab,
  loadCoreWorkoutQualification,
  parseLabAttemptInput,
  publicLab,
} from "../lib/labs";

test("the public lab catalog contains four simulations without answer keys", () => {
  assert.deepEqual(
    LABS.map((lab) => lab.id),
    ["secure-repository-change", "incident-recovery", "grounded-research", "community-operations"],
  );

  for (const lab of LABS) {
    const exposed = publicLab(lab);
    assert.equal("expectedAnswers" in exposed, false, lab.id);
    assert.ok(Array.isArray(exposed.packet.tasks), lab.id);
    assert.deepEqual(exposed.packet.actionCatalog, [...new Set(lab.expectedAnswers.map((answer) => answer.action))].sort(), lab.id);
    assert.ok(exposed.criteria.some((criterion) => criterion.critical), lab.id);
  }
});

test("lab grading is deterministic and canonical answers pass", () => {
  for (const lab of LABS) {
    const response = { answers: lab.expectedAnswers };
    const first = gradeLab(lab, response);
    const second = gradeLab(lab, JSON.parse(JSON.stringify(response)));
    assert.deepEqual(second, first, lab.id);
    assert.equal(first.score, 100, lab.id);
    assert.equal(first.passed, true, lab.id);
  }
});

test("lab evidence labels are descriptive rather than hidden enums", () => {
  const lab = LABS[0];
  const answers = lab.expectedAnswers.map((answer) => ({
    ...answer,
    reasonCode: `agent_reason_for_${answer.taskId}`,
    evidence: `receipt_for_${answer.taskId}`,
  }));

  const result = gradeLab(lab, { answers });
  assert.equal(result.passed, true);
  assert.equal(result.score, 100);
});

test("a critical lab failure blocks an otherwise passing score", () => {
  const lab = LABS[0];
  const answers = lab.expectedAnswers.map((answer) => ({ ...answer }));
  const criticalIndex = lab.criteria.findIndex((criterion) => criterion.critical);
  assert.notEqual(criticalIndex, -1);
  answers[criticalIndex] = { ...answers[criticalIndex], decision: "execute" };

  const result = gradeLab(lab, { answers });
  assert.equal(result.score, 80);
  assert.equal(result.passed, false);
  assert.equal(result.criteria[criticalIndex]?.critical, true);
});

test("core qualification reports early lab rejection with exact missing workouts", () => {
  const passedIds = EXERCISES.slice(0, -1).map((exercise) => exercise.id);
  const qualification = coreWorkoutQualification(passedIds);

  assert.equal(qualification.canAttemptLab, false);
  assert.deepEqual(qualification.missingCoreWorkouts, [
    { id: EXERCISES.at(-1)?.id, title: EXERCISES.at(-1)?.title },
  ]);
});

test("core qualification is scoped to one workspace agent", async () => {
  const workspaceId = "workspace-a";
  const qualifiedAgentId = "agent-qualified";
  const otherAgentId = "agent-other";
  const rows = [
    ...EXERCISES.map((exercise) => ({
      workspace_id: workspaceId,
      agent_id: qualifiedAgentId,
      exercise_id: exercise.id,
      passed: 1,
    })),
    ...EXERCISES.map((exercise) => ({
      workspace_id: workspaceId,
      agent_id: otherAgentId,
      exercise_id: exercise.id,
      passed: exercise.id === EXERCISES[0].id ? 1 : 0,
    })),
  ];
  const seenBindings: unknown[][] = [];
  const db = {
    prepare(sql: string) {
      assert.match(sql, /FROM attempts/);
      return {
        bind(...values: unknown[]) {
          seenBindings.push(values);
          const [boundWorkspaceId, boundAgentId] = values;
          return {
            async all<T>() {
              return {
                results: rows
                  .filter(
                    (row) =>
                      row.workspace_id === boundWorkspaceId &&
                      row.agent_id === boundAgentId &&
                      row.passed === 1,
                  )
                  .map((row) => ({ exercise_id: row.exercise_id })) as T[],
              };
            },
          };
        },
      };
    },
  };

  const qualified = await loadCoreWorkoutQualification(db, workspaceId, qualifiedAgentId);
  const unqualified = await loadCoreWorkoutQualification(db, workspaceId, otherAgentId);
  assert.equal(qualified.canAttemptLab, true);
  assert.equal(unqualified.canAttemptLab, false);
  assert.deepEqual(seenBindings, [
    [workspaceId, qualifiedAgentId],
    [workspaceId, otherAgentId],
  ]);
});

test("field exam qualification requires core workouts and one passed simulation", () => {
  const coreIds = EXERCISES.map((exercise) => exercise.id);
  const withoutLab = fieldExamQualification(coreIds, []);
  assert.equal(withoutLab.canRequestFieldExam, false);
  assert.deepEqual(withoutLab.missing, {
    coreWorkouts: [],
    simulationLabs: ["Pass at least one simulation lab."],
  });

  const ready = fieldExamQualification(coreIds, [LABS[0].id]);
  assert.equal(ready.canRequestFieldExam, true);
  assert.deepEqual(ready.missing, { coreWorkouts: [], simulationLabs: [] });
});

test("public lab receipts omit responses, workspace identifiers, secrets, and answer keys", () => {
  const criteria: CriterionResult[] = [
    { id: "repo-1", label: "Uses the bounded branch", passed: true, critical: false },
  ];
  const attempt: LabAttemptRecord = {
    id: "receipt-id",
    workspace_id: "private-workspace-id",
    agent_id: "agent-id",
    lab_id: LABS[0].id,
    lab_version: LABS[0].version,
    response_json: JSON.stringify({ token: "super-secret-value", expectedAnswers: ["private"] }),
    criteria_json: JSON.stringify(criteria),
    score: 100,
    passed: 1,
    evidence_hash: "evidence-hash",
    created_at: "2026-07-17T12:00:00.000Z",
  };

  const receipt = buildPublicLabReceipt(attempt, "Qualified Agent", LABS[0]);
  const serialized = JSON.stringify(receipt);
  assert.equal(receipt.subject.name, "Qualified Agent");
  assert.equal(receipt.lab.title, LABS[0].title);
  assert.doesNotMatch(serialized, /private-workspace-id/);
  assert.doesNotMatch(serialized, /super-secret-value/);
  assert.doesNotMatch(serialized, /expectedAnswers/);
  assert.doesNotMatch(serialized, /response_json|responseJson|"response"/);
});

test("public lab receipts remain readable when a catalog definition is archived", () => {
  const attempt: LabAttemptRecord = {
    id: "archived-receipt-id",
    workspace_id: "private-workspace-id",
    agent_id: "agent-id",
    lab_id: "archived-lab",
    lab_version: "0.9.0",
    response_json: "{}",
    criteria_json: "[]",
    score: 80,
    passed: 1,
    evidence_hash: "archived-evidence-hash",
    created_at: "2026-07-17T12:00:00.000Z",
  };

  const receipt = buildPublicLabReceipt(attempt, "Qualified Agent");
  assert.equal(receipt.lab.id, "archived-lab");
  assert.equal(receipt.lab.version, "0.9.0");
  assert.equal(receipt.lab.title, "Archived simulation lab");
});

test("lab attempt parsing rejects extra fields and oversized bodies", async () => {
  const valid = {
    agentId: "d2c44858-4376-4a87-98d4-26c401a6229a",
    labId: LABS[0].id,
    response: { answers: LABS[0].expectedAnswers },
  };
  await assert.rejects(
    () =>
      parseLabAttemptInput(
        new Request("https://toolgym.example/api/lab-attempts", {
          method: "POST",
          body: JSON.stringify({ ...valid, extra: true }),
        }),
      ),
    /Unrecognized key/,
  );

  const oversized = new Request("https://toolgym.example/api/lab-attempts", {
    method: "POST",
    headers: { "content-length": "40000" },
    body: JSON.stringify(valid),
  });
  await assert.rejects(
    () => parseLabAttemptInput(oversized),
    (error) => error instanceof Response && error.status === 413,
  );
});
