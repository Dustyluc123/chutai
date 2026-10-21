import type { AttributeFeedback, ThemeNoun } from "@chutai/shared";
import { DEFAULT_NOUN, nounPhrases } from "./noun";

/** Um número de 4 dígitos entre 1000 e 2100 (com ou sem "c.") é tratado como ano ("antes"/"depois"). */
function looksLikeYear(display: string): boolean {
  display = display.replace(/^c\.\s*/, "");
  if (!/^\d{4}$/.test(display.trim())) return false;
  const year = Number(display);
  return year >= 1000 && year <= 2100;
}

/**
 * Frase curta que explica uma peça do tabuleiro, para o balão e para leitores de tela.
 * Ex.: "Nascimento: 1993. O do personagem secreto é antes de 1993."
 * Só usa o que o navegador já recebe (o resultado do chute), nunca a resposta.
 */
export function explainFeedback(
  label: string,
  feedback: AttributeFeedback,
  noun: ThemeNoun = DEFAULT_NOUN,
): string {
  const value = feedback.display;
  const { theSecret, ofTheSecret } = nounPhrases(noun);
  let sentence: string;
  if (feedback.status === "unknown") {
    sentence = "Ninguém sabe ao certo, então não conta como erro.";
  } else if (feedback.status === "correct") {
    sentence = `Igual ao ${ofTheSecret}.`;
  } else if (feedback.direction) {
    const year = looksLikeYear(value);
    const comparison =
      feedback.direction === "up"
        ? year
          ? `depois de ${value}`
          : `maior que ${value}`
        : year
          ? `antes de ${value}`
          : `menor que ${value}`;
    const prefix = feedback.status === "partial" ? "Chegou perto! " : "";
    sentence = `${prefix}O ${ofTheSecret} é ${comparison}.`;
  } else if (feedback.status === "partial") {
    sentence = `Tem algo em comum com ${theSecret}, mas não tudo.`;
  } else {
    sentence = `Diferente ${ofTheSecret}.`;
  }
  return `${label}: ${value}. ${sentence}`;
}
