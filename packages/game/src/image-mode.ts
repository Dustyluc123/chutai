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

/** Efeito (zoom, redução e desfoque) de um nível. Lança erro para níveis fora da faixa da rodada. */
export function imageEffect(level: number): { zoom: number; pixels: number; blur: number } {
  const effect = IMAGE_MODE.effects[level];
  if (!Number.isInteger(level) || !effect) throw new Error(`Nível de imagem inválido: ${level}`);
  return effect;
}

/** Ponto (frações de 0 a 1 da largura e da altura) em volta do qual a imagem é ampliada. */
export interface ZoomCenter {
  x: number;
  y: number;
}

/** Sorteia o ponto do zoom dentro da área central (IMAGE_MODE.zoomCenterArea). */
export function drawZoomCenter(random: () => number = Math.random): ZoomCenter {
  const area = IMAGE_MODE.zoomCenterArea;
  const margin = (1 - area) / 2;
  return { x: margin + random() * area, y: margin + random() * area };
}

/**
 * Janela quadrada (em frações da imagem) que aparece num zoom: com zoom 3, um terço da largura
 * em volta do centro. A janela nunca sai da imagem; com zoom 1, é a imagem inteira.
 */
export function zoomWindow(
  zoom: number,
  center: ZoomCenter,
): { left: number; top: number; size: number } {
  const size = 1 / Math.max(1, zoom);
  const clamp = (value: number) => Math.min(1 - size, Math.max(0, value - size / 2));
  return { left: clamp(center.x), top: clamp(center.y), size };
}
