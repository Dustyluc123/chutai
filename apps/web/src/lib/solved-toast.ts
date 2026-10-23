/**
 * Junta os avisos de acerto que chegam quase ao mesmo tempo num aviso só. Numa sala cheia
 * (uma live com 30 pessoas), cada acerto virando um aviso cobriria a tela.
 */
export interface SolvedNotice {
  nickname: string;
  rank: number;
}

export function solvedToastText(notices: readonly SolvedNotice[]): string {
  if (notices.length === 0) return "";
  const first = notices.find((notice) => notice.rank === 1);
  const names = notices.map((notice) => notice.nickname);
  if (notices.length === 1) return `${names[0]} acertou${first ? " primeiro" : ""}!`;
  const lead = first ? `${first.nickname} acertou primeiro` : undefined;
  const others = first ? names.filter((name) => name !== first.nickname) : names;
  if (lead) {
    return others.length === 1
      ? `${lead}, e ${others[0]} também!`
      : `${lead}, e mais ${others.length} também!`;
  }
  if (others.length === 2) return `${others[0]} e ${others[1]} acertaram!`;
  return `${others[0]} e mais ${others.length - 1} acertaram!`;
}
