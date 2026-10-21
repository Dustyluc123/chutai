import type { FeedbackStatus, GuessResult } from "@chutai/shared";

const SQUARE: Record<FeedbackStatus, string> = {
  correct: "🟩",
  partial: "🟨",
  wrong: "🟥",
  unknown: "⬜",
};

/**
 * Texto de compartilhar do diário, no estilo do Wordle, sem revelar o personagem:
 *
 *   Chutaí #12 · Folclore brasileiro
 *   Acertei em 3 chutes
 *   🟥🟨🟥🟥🟨
 *   🟩🟩🟩🟩🟩
 *   https://.../diario
 */
export function dailyShareText(input: {
  number: number;
  themeName: string;
  guesses: GuessResult[];
  hintsUsed: number;
  url: string;
}): string {
  const count = input.guesses.length;
  const lines = [
    `Chutaí #${input.number} · ${input.themeName}`,
    `Acertei em ${count} ${count === 1 ? "chute" : "chutes"}${
      input.hintsUsed
        ? ` (usei ${input.hintsUsed} ${input.hintsUsed === 1 ? "dica" : "dicas"})`
        : ""
    }`,
    ...input.guesses.map((guess) => guess.feedback.map((item) => SQUARE[item.status]).join("")),
    input.url,
  ];
  return lines.join("\n");
}
