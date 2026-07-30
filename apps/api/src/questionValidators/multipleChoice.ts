import type { MultipleChoiceAnswer } from "@quizcat/shared";

// given: { choiceId } · truth: { correctId }
export function multipleChoice(given: any, truth: MultipleChoiceAnswer): boolean {
  return typeof given?.choiceId === "string" && given.choiceId === truth.correctId;
}
