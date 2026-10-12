// source/domain/training/workout-type.test.mjs — Version 1.0
import test from "node:test";
import assert from "node:assert/strict";
import { classifyWorkoutType, getWorkoutTypeLabel, normalizeExerciseType } from "./workout-type.js";
test("infers each single-category workout", () => {
    assert.equal(classifyWorkoutType([{ exerciseType: "cardio" }, { exerciseType: "cardio" }]), "cardio");
    assert.equal(classifyWorkoutType([{ exerciseType: "strength" }]), "strength");
    assert.equal(classifyWorkoutType([{ exerciseType: "bodyweight" }, { exerciseType: "bodyweight" }]), "bodyweight");
});
test("infers mixed workouts whenever multiple categories are present", () => {
    for (const types of [["cardio", "strength"], ["cardio", "bodyweight"], ["strength", "bodyweight"], ["cardio", "strength", "bodyweight"]]) {
        assert.equal(classifyWorkoutType(types.map((exerciseType) => ({ exerciseType }))), "mixed");
    }
});
test("returns no category for an empty workout and uses a safe legacy fallback", () => {
    assert.equal(classifyWorkoutType([]), null);
    assert.equal(normalizeExerciseType("legacy-unknown"), "strength");
    assert.equal(getWorkoutTypeLabel("bodyweight"), "Тренировка с собственным весом");
});
