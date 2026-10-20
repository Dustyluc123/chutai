/**
 * Temas oficiais (carregados dos JSON em ../seed) e funções puras sobre temas.
 * Este arquivo não depende de banco: pode ser usado em qualquer lugar.
 */
import type { CharacterOption, Theme, ThemeSummary } from "@chutai/shared";
import { supportsImageMode } from "@chutai/game";
import folclore from "../seed/folclore-brasileiro.json" with { type: "json" };
import futebol from "../seed/lendas-do-futebol.json" with { type: "json" };
import fauna from "../seed/fauna-brasileira.json" with { type: "json" };

/** Ordem em que aparecem no site. */
export const OFFICIAL_THEMES: readonly Theme[] = [folclore, futebol, fauna] as Theme[];

export function toThemeSummary(theme: Theme): ThemeSummary {
  return {
    slug: theme.slug,
    name: theme.name,
    description: theme.description,
    emoji: theme.emoji,
    color: theme.color,
    visibility: theme.visibility,
    characterCount: theme.characters.length,
    imageModeAvailable: supportsImageMode(theme.characters),
    attributes: theme.attributes.map(({ key, label }) => ({ key, label })),
  };
}

/** Lista para o autocompletar. Nunca diz qual personagem é a resposta. */
export function toCharacterOptions(theme: Theme): CharacterOption[] {
  return theme.characters
    .map((character) => ({
      id: character.id,
      name: character.name,
      aliases: character.aliases ?? [],
      emoji: character.emoji,
      image: character.image,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

/** Confere se um tema está consistente antes de usar ou salvar. Devolve a lista de problemas. */
export function validateTheme(theme: Theme): string[] {
  const problems: string[] = [];
  if (theme.attributes.length < 2) problems.push("O tema precisa de pelo menos 2 atributos.");
  if (theme.characters.length < 5) problems.push("O tema precisa de pelo menos 5 personagens.");

  const attributeKeys = new Set(theme.attributes.map((attr) => attr.key));
  const ids = new Set<string>();
  for (const character of theme.characters) {
    if (ids.has(character.id)) problems.push(`Personagem repetido: ${character.id}`);
    ids.add(character.id);
    for (const key of attributeKeys) {
      if (character.values[key] === undefined) {
        problems.push(`${character.name} não tem valor para "${key}".`);
      }
    }
    for (const attr of theme.attributes) {
      const value = character.values[attr.key];
      if (value === undefined) continue;
      const isNumeric = attr.type === "number" || attr.type === "range";
      if (isNumeric && typeof value !== "number") {
        problems.push(`${character.name}: "${attr.key}" deveria ser número.`);
      }
      if (attr.type === "list" && !Array.isArray(value)) {
        problems.push(`${character.name}: "${attr.key}" deveria ser lista.`);
      }
    }
  }
  return problems;
}
