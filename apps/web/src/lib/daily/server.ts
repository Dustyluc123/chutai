import "server-only";
import { createHmac } from "node:crypto";
import type { Character, CharacterReveal, Theme } from "@chutai/shared";
import { addDays, dailyAnswerId, dailyDateKey, dailyNumber, formatValue } from "@chutai/game";
import { DAILY_THEME_SLUGS, OFFICIAL_THEMES, dailyRoster } from "@chutai/db";

/** Falta a chave secreta: o diário não funciona (de propósito, sem chave padrão). */
export class DailySecretMissing extends Error {
  constructor() {
    super("Desafio diário indisponível: falta configurar a variável DAILY_SECRET no servidor.");
  }
}

/**
 * Chave do sorteio do dia. Só existe no servidor (sem NEXT_PUBLIC_) e não tem valor padrão:
 * com uma chave conhecida, qualquer um calcularia as respostas.
 */
export function dailySecret(): string {
  const secret = process.env.DAILY_SECRET?.trim();
  if (!secret) throw new DailySecretMissing();
  return secret;
}

/** Temas oficiais com diário, na ordem do site. */
export function dailyThemes(): Theme[] {
  return DAILY_THEME_SLUGS.map((slug) => OFFICIAL_THEMES.find((t) => t.slug === slug)).filter(
    (theme): theme is Theme => !!theme,
  );
}

export function dailyTheme(slug: string): Theme | undefined {
  return DAILY_THEME_SLUGS.includes(slug)
    ? OFFICIAL_THEMES.find((theme) => theme.slug === slug)
    : undefined;
}

/** Hoje no fuso do diário: data e número (Chutaí #N). */
export function today(now = new Date()): { dateKey: string; number: number } {
  const dateKey = dailyDateKey(now);
  return { dateKey, number: dailyNumber(dateKey) };
}

/** Personagem do dia de um tema numa data. */
export function dailyAnswer(theme: Theme, dateKey: string, secret = dailySecret()): Character {
  const roster = dailyRoster(theme.slug);
  if (!roster) throw new Error(`Tema sem diário: ${theme.slug}`);
  const id = dailyAnswerId({
    dateKey,
    roster,
    rank: (cycle, characterId) =>
      createHmac("sha256", secret).update(`${theme.slug}:${cycle}:${characterId}`).digest("hex"),
    available: new Set(theme.characters.map((character) => character.id)),
  });
  return theme.characters.find((character) => character.id === id)!;
}

/** O personagem de ontem (já é passado, pode ser mostrado). Null no primeiro dia. */
export function yesterdayAnswer(theme: Theme, dateKey: string, secret = dailySecret()) {
  if (dailyNumber(dateKey) <= 1) return null;
  const character = dailyAnswer(theme, addDays(dateKey, -1), secret);
  return { name: character.name, emoji: character.emoji, image: character.image };
}

export function revealOf(theme: Theme, character: Character): CharacterReveal {
  return {
    id: character.id,
    name: character.name,
    emoji: character.emoji,
    image: character.image,
    values: theme.attributes.map((attr) => ({
      key: attr.key,
      label: attr.label,
      display: formatValue(attr, character.values[attr.key]),
    })),
  };
}
