import type { Character, GuessResult, HintReveal, HintType, ThemeAttribute } from "@chutai/shared";
import { HINTS } from "./config";
import { UNKNOWN_VALUE } from "@chutai/shared";
import { formatCharacterValue } from "./format";

export interface HintContext {
  hintsEnabled: boolean;
  guesses: GuessResult[];
  hintsUsed: HintReveal[];
  solved: boolean;
}

/** Diz se o jogador pode pedir uma dica agora e, se não, por quê. */
export function canRequestHint(
  type: HintType,
  ctx: HintContext,
): { allowed: true } | { allowed: false; reason: string } {
  if (!ctx.hintsEnabled) return { allowed: false, reason: "Dicas estão desligadas nesta sala." };
  if (ctx.solved) return { allowed: false, reason: "Você já acertou esta rodada." };
  if (ctx.guesses.length < HINTS.unlockAfterGuesses) {
    const missing = HINTS.unlockAfterGuesses - ctx.guesses.length;
    return {
      allowed: false,
      reason: `Faça mais ${missing} ${missing === 1 ? "chute" : "chutes"} para liberar as dicas.`,
    };
  }
  if (ctx.hintsUsed.length >= HINTS.maxPerRound) {
    return { allowed: false, reason: "Você já usou todas as dicas desta rodada." };
  }
  if (ctx.hintsUsed.some((hint) => hint.type === type)) {
    return { allowed: false, reason: "Você já usou essa dica." };
  }
  return { allowed: true };
}

/**
 * Gera a dica.
 * - attribute: revela o valor certo do primeiro atributo que o jogador ainda não acertou.
 * - firstLetter: revela a primeira letra do nome.
 */
export function buildHint(
  type: HintType,
  answer: Character,
  attributes: ThemeAttribute[],
  guesses: GuessResult[],
): HintReveal {
  if (type === "firstLetter") {
    const letter = answer.name.trim().charAt(0).toUpperCase();
    return { type, text: `O nome começa com “${letter}”.` };
  }

  const alreadyCorrect = new Set(
    guesses.flatMap((guess) =>
      guess.feedback.filter((item) => item.status === "correct").map((item) => item.key),
    ),
  );
  // Não revela atributo "Incerto": a dica não ajudaria em nada.
  const known = attributes.filter((attr) => answer.values[attr.key] !== UNKNOWN_VALUE);
  const target = known.find((attr) => !alreadyCorrect.has(attr.key)) ?? known[0];
  if (!target) return { type, text: "Este tema não tem atributos para revelar." };

  const value = formatCharacterValue(target, answer);
  return { type, attributeKey: target.key, text: `${target.label}: ${value}` };
}
