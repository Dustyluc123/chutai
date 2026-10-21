import type { AttributeFeedback } from "@chutai/shared";

/** Um número de 4 dígitos entre 1800 e 2100 é tratado como ano ("antes"/"depois"). */
function looksLikeYear(display: string): boolean {
  if (!/^\d{4}$/.test(display.trim())) return false;
  const year = Number(display);
  return year >= 1800 && year <= 2100;
}

/**
 * Frase curta que explica uma peça do tabuleiro, para o balão e para leitores de tela.
 * Ex.: "Nascimento: 1993. O do personagem secreto é antes de 1993."
 * Só usa o que o navegador já recebe (o resultado do chute), nunca a resposta.
 */
export function explainFeedback(label: string, feedback: AttributeFeedback): string {
  const value = feedback.display;
  let sentence: string;
  if (feedback.status === "correct") {
    sentence = "Igual ao do personagem secreto.";
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
    sentence = `${prefix}O do personagem secreto é ${comparison}.`;
  } else if (feedback.status === "partial") {
    sentence = "Tem algo em comum com o personagem secreto, mas não tudo.";
  } else {
    sentence = "Diferente do personagem secreto.";
  }
  return `${label}: ${value}. ${sentence}`;
}
