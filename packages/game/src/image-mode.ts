import type { Character } from "@chutai/shared";
import { IMAGE_MODE } from "./config";

/** Maior nível que um jogador pode alcançar durante a rodada (o nítido fica para a revelação). */
export const MAX_ROUND_IMAGE_LEVEL = IMAGE_MODE.levels - 2;

export interface ImageLevelInput {
  /** Chutes errados na rodada. */
  wrongGuesses: number;
  hintsUsed: number;
}

/**
 * Nível de nitidez da imagem secreta para um jogador: 0 no começo,
 * +1 por chute errado e +1 por dica, sem passar de MAX_ROUND_IMAGE_LEVEL.
 */
export function imageLevel({ wrongGuesses, hintsUsed }: ImageLevelInput): number {
  const raw =
    IMAGE_MODE.perWrongGuess * Math.max(0, wrongGuesses) +
    IMAGE_MODE.perHint * Math.max(0, hintsUsed);
  return Math.min(MAX_ROUND_IMAGE_LEVEL, Math.floor(raw));
}

/** O modo Imagem só funciona se todos os personagens do tema tiverem imagem. */
export function supportsImageMode(characters: readonly Pick<Character, "image">[]): boolean {
  return characters.length > 0 && characters.every((character) => !!character.image);
}

/** Efeito (redução e desfoque) de um nível. Lança erro para níveis fora da faixa da rodada. */
export function imageEffect(level: number): { pixels: number; blur: number } {
  const effect = IMAGE_MODE.effects[level];
  if (!Number.isInteger(level) || !effect) throw new Error(`Nível de imagem inválido: ${level}`);
  return effect;
}
