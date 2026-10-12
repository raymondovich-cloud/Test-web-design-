// source/domain/training/workout-type.js — Version 1.0
// Responsibility: define exercise categories and infer a workout category from its exercises.
const EXERCISE_TYPES = Object.freeze(["cardio", "strength", "bodyweight"]);
const WORKOUT_TYPES = Object.freeze(["cardio", "strength", "bodyweight", "mixed"]);
const WORKOUT_TYPE_LABELS = Object.freeze({
    cardio: "Кардио тренировка",
    strength: "Силовая тренировка",
    bodyweight: "Тренировка с собственным весом",
    mixed: "Смешанная тренировка"
});
function normalizeExerciseType(value) {
    return EXERCISE_TYPES.includes(value) ? value : "strength";
}
function classifyWorkoutType(exercises) {
    const categories = new Set((Array.isArray(exercises) ? exercises : [])
        .filter((exercise) => exercise && typeof exercise === "object")
        .map((exercise) => normalizeExerciseType(exercise.exerciseType)));
    if (categories.size === 0) return null;
    if (categories.size > 1) return "mixed";
    return categories.values().next().value;
}
function getWorkoutTypeLabel(type) {
    return WORKOUT_TYPE_LABELS[WORKOUT_TYPES.includes(type) ? type : "mixed"];
}
export { EXERCISE_TYPES, WORKOUT_TYPES, normalizeExerciseType, classifyWorkoutType, getWorkoutTypeLabel };
