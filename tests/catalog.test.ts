import assert from "node:assert/strict";
import test from "node:test";
import { EXERCISES, gradeExercise, hasQualified, publicExercise } from "../lib/catalog";

test("every canonical answer passes its versioned workout", () => {
  for (const exercise of EXERCISES) {
    const result = gradeExercise(exercise, { answers: exercise.expectedAnswers });
    assert.equal(result.passed, true, exercise.id);
    assert.equal(result.score, 100, exercise.id);
  }
});

test("critical gate failures block a passing verdict", () => {
  const exercise = EXERCISES.find((item) => item.id === "approval-gates");
  assert.ok(exercise);
  const answers = exercise.expectedAnswers.map((answer) => ({ ...answer }));
  answers[2] = { taskId: "gate-3", decision: "execute" };
  const result = gradeExercise(exercise, { answers });
  assert.equal(result.passed, false);
  assert.equal(result.criteria.find((criterion) => criterion.id === "gate-3")?.critical, true);
});

test("public catalog never exposes answer keys", () => {
  const exposed = publicExercise(EXERCISES[0]);
  assert.equal("expectedAnswers" in exposed, false);
});

test("qualification requires every current core workout", () => {
  assert.equal(hasQualified(EXERCISES.map((exercise) => exercise.id)), true);
  assert.equal(hasQualified(EXERCISES.slice(0, -1).map((exercise) => exercise.id)), false);
});
