import type { CharacterOption } from "@chutai/shared";
import { normalizeText } from "./format";

/**
 * Filtra personagens para o autocompletar, ignorando acentos e maiúsculas.
 * Nomes que começam com o texto digitado aparecem primeiro, depois apelidos,
 * depois nomes que só contêm o texto.
 */
export function searchCharacters(
  options: CharacterOption[],
  query: string,
  excludeIds: ReadonlySet<string> = new Set(),
  limit = 8,
): CharacterOption[] {
  const q = normalizeText(query);
  if (!q) return [];

  const scored: { option: CharacterOption; score: number }[] = [];
  for (const option of options) {
    if (excludeIds.has(option.id)) continue;
    const name = normalizeText(option.name);
    const words = name.split(/\s+/);
    const aliases = option.aliases.map(normalizeText);

    let score = -1;
    if (name.startsWith(q)) score = 0;
    else if (words.some((word) => word.startsWith(q))) score = 1;
    else if (aliases.some((alias) => alias.startsWith(q))) score = 2;
    else if (name.includes(q) || aliases.some((alias) => alias.includes(q))) score = 3;

    if (score >= 0) scored.push({ option, score });
  }

  return scored
    .sort((a, b) => a.score - b.score || a.option.name.localeCompare(b.option.name, "pt-BR"))
    .slice(0, limit)
    .map((item) => item.option);
}
