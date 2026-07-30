import type { HigherLowerAnswer } from "@quizcat/shared";

// given: { choice: "higher" | "lower" } · truth: { bHigher }
export function higherLower(given: any, truth: HigherLowerAnswer): boolean {
  if (given?.choice !== "higher" && given?.choice !== "lower") return false;
  return (given.choice === "higher") === truth.bHigher;
}
