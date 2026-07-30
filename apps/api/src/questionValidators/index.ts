import type { QuestionTypeSlug } from "@quizcat/shared";
import { multipleChoice } from "./multipleChoice.js";
import { textInput } from "./textInput.js";
import { mapGuess } from "./mapGuess.js";
import { ordering } from "./ordering.js";
import { higherLower } from "./higherLower.js";
import { estimation } from "./estimation.js";

export type Validator = (given: any, truth: any) => boolean;

// Registre de plugins: slug → validador. Afegir un tipus = afegir una entrada aquí.
export const validators: Record<QuestionTypeSlug, Validator> = {
  multiple_choice: multipleChoice,
  text_input: textInput,
  map_guess: mapGuess,
  ordering,
  timeline: ordering, // mateixa validació: la seqüència ha de coincidir
  higher_lower: higherLower,
  estimation,
  // MVP: àudio/imatge/silueta amb opcions es validen com una opció múltiple.
  audio_clip: multipleChoice,
  image_guess: multipleChoice,
  silhouette: multipleChoice,
};

/** Corregeix una resposta al SERVIDOR. `truth` és questions.answer, que mai surt del backend. */
export function grade(typeSlug: QuestionTypeSlug, given: unknown, truth: unknown): boolean {
  const v = validators[typeSlug];
  if (!v) throw new Error(`Cap validador per al tipus de pregunta: ${typeSlug}`);
  return v(given, truth);
}
