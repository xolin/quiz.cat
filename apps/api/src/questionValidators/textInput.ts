import type { TextInputAnswer } from "@quizcat/shared";

function normalize(s: string, opts?: TextInputAnswer["normalize"]): string {
  let out = s.trim();
  if (opts?.lowercase) out = out.toLowerCase();
  // Treu accents: descompon i elimina els signes diacrítics combinats (U+0300–U+036F).
  if (opts?.stripAccents) out = out.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return out;
}

// given: { text } · truth: { accepted, normalize }
export function textInput(given: any, truth: TextInputAnswer): boolean {
  if (typeof given?.text !== "string") return false;
  const g = normalize(given.text, truth.normalize);
  return truth.accepted.some((a) => normalize(a, truth.normalize) === g);
}
