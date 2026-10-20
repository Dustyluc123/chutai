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

/**
 * Modo Imagem: a imagem secreta começa bem degradada e fica mais nítida
 * a cada chute errado e a cada dica. São 6 níveis, do 0 (o mais borrado) ao 5 (nítido);
 * durante a rodada o jogador chega no máximo ao 4, e a imagem nítida só aparece na revelação.
 */
export const IMAGE_MODE = {
  /** Total de níveis, contando o nítido. */
  levels: 6,
  /** Níveis ganhos por chute errado. */
  perWrongGuess: 1,
  /** Níveis ganhos por dica usada. */
  perHint: 1,
  /**
   * Desconto por chute além do primeiro, no lugar de SCORING.perExtraGuess.
   * Maior que no Clássico porque chutar errado também deixa a imagem mais nítida.
   */
  perExtraGuess: 80,
  /**
   * Como degradar cada nível (do 0 ao penúltimo): a imagem é reduzida para `pixels` × `pixels`
   * (vira blocos) e depois recebe um desfoque de raio `blur`.
   */
  effects: [
    { pixels: 6, blur: 6 },
    { pixels: 10, blur: 4 },
    { pixels: 16, blur: 2.5 },
    { pixels: 26, blur: 1.5 },
    { pixels: 44, blur: 0.8 },
  ] as readonly { pixels: number; blur: number }[],
} as const;

export const TIMING = {
  /** Segundos mostrando o personagem revelado antes da próxima rodada. */
  intermissionSeconds: 10,
} as const;
