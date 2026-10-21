/**
 * Regras do pódio de compartilhar (imagem e texto), sem React: usadas no servidor (imagem)
 * e no navegador (texto), e testadas em tests/podium.test.ts.
 */
interface Entry {
  position: number;
  nickname: string;
  score: number;
}

const POINTS = new Intl.NumberFormat("pt-BR");

/** 1567 → "1.567". */
export function formatPoints(score: number): string {
  return POINTS.format(score);
}

/**
 * Os 3 primeiros da classificação (já ordenada, com empates na mesma posição) e quantos
 * outros empataram com o 3º e ficaram de fora ("e mais 1 empatado").
 */
export function podiumTop<T extends Entry>(standings: T[]): { top: T[]; tiedOut: number } {
  const top = standings.slice(0, 3);
  const last = top[2];
  const tiedOut = last
    ? standings.slice(3).filter((entry) => entry.position === last.position).length
    : 0;
  return { top, tiedOut };
}

/** "Lucas ganhou!", "Lucas e Bia empataram!" ou "Lucas, Bia e Caio empataram!". */
export function podiumTitle(standings: Entry[]): string {
  const winners = standings.filter((entry) => entry.position === 1).map((entry) => entry.nickname);
  if (winners.length === 0) return "Fim de jogo";
  if (winners.length === 1) return `${winners[0]} ganhou!`;
  const names =
    winners.length <= 3
      ? `${winners.slice(0, -1).join(", ")} e ${winners.at(-1)}`
      : `${winners.length} jogadores`;
  return `${names} empataram!`;
}

/**
 * Texto que acompanha a imagem (ou vai sozinho no "Copiar texto"):
 * "Joguei Chutaí no tema Folclore brasileiro: 1º Lucas (1.567), 2º Bia (1.324), 3º Caio (990).
 * Jogue também: https://..."
 */
export function shareText(themeName: string, standings: Entry[], siteUrl: string): string {
  const { top, tiedOut } = podiumTop(standings);
  const places = top.map((e) => `${e.position}º ${e.nickname} (${formatPoints(e.score)})`);
  const extra = tiedOut ? ` e mais ${tiedOut} ${tiedOut === 1 ? "empatado" : "empatados"}` : "";
  return `Joguei Chutaí no tema ${themeName}: ${places.join(", ")}${extra}. Jogue também: ${siteUrl}`;
}
