/**
 * Temas oficiais (carregados dos JSON em ../seed) e funções puras sobre temas.
 * Este arquivo não depende de banco: pode ser usado em qualquer lugar.
 */
import type { CharacterOption, Theme, ThemeSummary } from "@chutai/shared";
import { imageModeAvailability } from "@chutai/game";
import folclore from "../seed/folclore-brasileiro.json" with { type: "json" };
import futebol from "../seed/lendas-do-futebol.json" with { type: "json" };
import fauna from "../seed/fauna-brasileira.json" with { type: "json" };
import musica from "../seed/musica-brasileira.json" with { type: "json" };
import futebolAtual from "../seed/futebol-atual.json" with { type: "json" };
import youtubers from "../seed/youtubers-e-streamers.json" with { type: "json" };
import famososTv from "../seed/famosos-da-tv.json" with { type: "json" };

/** Ordem em que aparecem no site. */
export const OFFICIAL_THEMES: readonly Theme[] = [
  youtubers,
  musica,
  futebolAtual,
  famososTv,
  folclore,
  futebol,
  fauna,
] as Theme[];

export function toThemeSummary(theme: Theme): ThemeSummary {
  return {
    slug: theme.slug,
    name: theme.name,
    description: theme.description,
    emoji: theme.emoji,
    color: theme.color,
    visibility: theme.visibility,
    characterCount: theme.characters.length,
    imageMode: imageModeAvailability(theme.characters),
    imageCharacterCount: theme.characters.filter((character) => !!character.image).length,
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

/**
 * Formato aceito para `image`: caminho no próprio site ("/temas/<slug>/<id>.webp")
 * ou URL https (armazenamento de imagens da comunidade, no futuro). Só formatos de imagem.
 */
const IMAGE_PATH = /^(\/(?!\/)|https:\/\/)[^\s?#]+\.(webp|png|jpe?g|avif)$/i;

/** Diz o que há de errado com o campo `image` de um personagem (ou null se estiver certo). */
export function imageProblem(image: string): string | null {
  if (image.includes("..")) return "o caminho da imagem não pode ter “..”";
  if (!IMAGE_PATH.test(image)) {
    return "a imagem precisa ser um caminho do site (/...) ou uma URL https, terminando em .webp, .png, .jpg ou .avif";
  }
  return null;
}

/** Confere se um tema está consistente antes de usar ou salvar. Devolve a lista de problemas. */
export function validateTheme(theme: Theme): string[] {
  const problems: string[] = [];
  if (theme.attributes.length < 2) problems.push("O tema precisa de pelo menos 2 atributos.");
  if (theme.characters.length < 5) problems.push("O tema precisa de pelo menos 5 personagens.");
  if (theme.dataUpdatedAt !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(theme.dataUpdatedAt)) {
    problems.push("dataUpdatedAt precisa estar no formato AAAA-MM (ex.: 2026-10).");
  }

  const attributeKeys = new Set(theme.attributes.map((attr) => attr.key));
  const ids = new Set<string>();
  for (const character of theme.characters) {
    if (ids.has(character.id)) problems.push(`Personagem repetido: ${character.id}`);
    ids.add(character.id);
    if (character.image !== undefined) {
      const problem = imageProblem(character.image);
      if (problem) problems.push(`${character.name}: ${problem}.`);
    }
    if (character.imageCredit) {
      if (!character.imageCredit.author.trim() || !character.imageCredit.license.trim()) {
        problems.push(`${character.name}: o crédito da imagem precisa de autor e licença.`);
      }
      if (!character.image)
        problems.push(`${character.name}: tem crédito de imagem, mas não tem imagem.`);
    }
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
