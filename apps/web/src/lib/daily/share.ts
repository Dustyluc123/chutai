import type { FeedbackStatus, GuessResult } from "@chutai/shared";
import { DAILY, dailyLivesLeft } from "@chutai/game";

const SQUARE: Record<FeedbackStatus, string> = {
  correct: "🟩",
  partial: "🟨",
  wrong: "🟥",
  unknown: "⬜",
};

/** ❤️ para os corações que sobraram e 🖤 para os perdidos. */
export function heartsLine(guesses: readonly { correct: boolean }[], lives = DAILY.lives): string {
  const left = dailyLivesLeft(guesses, lives);
  return "❤️".repeat(left) + "🖤".repeat(lives - left);
}

/**
 * Texto de compartilhar do diário, no estilo do Wordle, sem revelar o personagem:
 *
 *   Chutaí #12 · Folclore brasileiro
 *   Acertei no 4º chute ❤️❤️❤️❤️❤️🖤🖤🖤
 *   🟥🟨🟥🟥🟨
 *   ...
 *   🟩🟩🟩🟩🟩
 *   https://.../diario
 *
 * Com corações: "Acertei no Nº chute" + corações, ou "Não consegui" + 8 corações pretos.
 * Sem corações (desafio começado antes da mudança): "Acertei em N chutes", como antes.
 */
export function dailyShareText(input: {
  number: number;
  themeName: string;
  guesses: GuessResult[];
  hintsUsed: number;
  url: string;
  /** Desafio com corações (padrão: não, o texto antigo). */
  lives?: boolean;
}): string {
  const count = input.guesses.length;
  const hints = input.hintsUsed
    ? `${input.hintsUsed} ${input.hintsUsed === 1 ? "dica" : "dicas"}`
    : "";
  const won = input.guesses.some((guess) => guess.correct);
  const result = input.lives
    ? `${won ? `Acertei no ${count}º chute` : "Não consegui"} ${heartsLine(input.guesses)}${
        hints ? ` · usei ${hints}` : ""
      }`
    : `Acertei em ${count} ${count === 1 ? "chute" : "chutes"}${hints ? ` (usei ${hints})` : ""}`;
  const lines = [
    `Chutaí #${input.number} · ${input.themeName}`,
    result,
    ...input.guesses.map((guess) => guess.feedback.map((item) => SQUARE[item.status]).join("")),
    input.url,
  ];
  return lines.join("\n");
}
