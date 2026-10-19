import { SCORING } from "./config";

export interface ScoreInput {
  /** Milissegundos que sobravam no cronômetro quando acertou. */
  remainingMs: number;
  /** Duração total da rodada em milissegundos. */
  totalMs: number;
  /** Número de chutes, contando o certo. */
  guesses: number;
  hintsUsed: number;
  /** 1 = primeiro a acertar. */
  solveRank: number;
}

/**
 * Pontos de quem acertou a rodada:
 *
 *   max(100, 500 + 500 × (tempo restante / tempo total) − 40 × (chutes − 1) − 150 × dicas) + bônus
 *
 * Bônus: +100 para o primeiro a acertar, +50 para o segundo.
 * Quem não acerta não pontua (não precisa chamar esta função).
 */
export function computeRoundPoints(input: ScoreInput): number {
  const ratio = input.totalMs > 0 ? clamp(input.remainingMs / input.totalMs, 0, 1) : 0;
  const speed = SCORING.speed * ratio;
  const guessPenalty = SCORING.perExtraGuess * Math.max(0, input.guesses - 1);
  const hintPenalty = SCORING.perHint * Math.max(0, input.hintsUsed);

  const raw = SCORING.base + speed - guessPenalty - hintPenalty;
  const bonus = SCORING.rankBonus[input.solveRank - 1] ?? 0;

  return Math.round(Math.max(SCORING.minimum, raw)) + bonus;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
