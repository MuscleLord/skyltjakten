export const FIRST_TARGET = 1;
export const LAST_TARGET = 999;

export function formatTargetNumber(stepIndex: number): string {
  return stepIndex.toString().padStart(3, "0");
}

export function isChallengeCompleted(stepIndex: number): boolean {
  return stepIndex > LAST_TARGET;
}