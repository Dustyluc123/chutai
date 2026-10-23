/**
 * Listas longas de jogadores (salas de live, até 30): mostra os primeiros e, se você estiver
 * mais para baixo, também você, com um "Ver todos" para o resto. Regra pura, testada.
 */
export function visibleEntries<T>(
  items: readonly T[],
  options: { limit: number; isMe: (item: T) => boolean; expanded: boolean },
): { shown: { item: T; index: number }[]; hidden: number } {
  const all = items.map((item, index) => ({ item, index }));
  if (options.expanded || items.length <= options.limit + 1) return { shown: all, hidden: 0 };
  const shown = all.slice(0, options.limit);
  const me = all.find(({ item }) => options.isMe(item));
  if (me && me.index >= options.limit) shown.push(me);
  return { shown, hidden: items.length - shown.length };
}
