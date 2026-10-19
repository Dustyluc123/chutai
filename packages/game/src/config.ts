/**
 * Números do jogo num lugar só. São um ponto de partida:
 * ajuste depois de testar partidas com os amigos.
 */
export const SCORING = {
  /** Pontos garantidos para quem acerta, mesmo no último segundo. */
  base: 500,
  /** Pontos extras máximos por velocidade (proporcionais ao tempo que sobrou). */
  speed: 500,
  /** Desconto por chute além do primeiro. */
  perExtraGuess: 40,
  /** Desconto por dica usada. */
  perHint: 150,
  /** Ninguém que acerta fica abaixo disso (antes do bônus). */
  minimum: 100,
  /** Bônus por ordem de acerto: 1º lugar, 2º lugar... */
  rankBonus: [100, 50] as readonly number[],
} as const;

export const HINTS = {
  /** Quantos chutes errados antes de liberar as dicas. */
  unlockAfterGuesses: 3,
  /** Máximo de dicas por jogador por rodada. */
  maxPerRound: 2,
} as const;

export const TIMING = {
  /** Segundos mostrando o personagem revelado antes da próxima rodada. */
  intermissionSeconds: 10,
} as const;
