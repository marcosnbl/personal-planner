"use client";

// The UI and offline preparation must use the same import sites and chunks.
export const loadWorkoutEditor = () =>
  import("./workout-editor").then((module) => module.WorkoutEditor);

export const loadMoveDialog = () =>
  import("./move-dialog").then((module) => module.MoveDialog);

export const loadTrainingStatistics = () =>
  import("./training-statistics").then((module) => module.TrainingStatistics);

export const loadAccountPanel = () =>
  import("./account-panel").then((module) => module.AccountPanel);
