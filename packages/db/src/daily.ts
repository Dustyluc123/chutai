/**
 * Roster do desafio diário: quais personagens de cada tema oficial podem cair no diário e
 * desde quando. NÃO diz qual personagem cai em qual dia (isso depende da chave DAILY_SECRET,
 * que só existe no servidor do site). Gerado e atualizado por `pnpm daily:roster`.
 */
import type { DailyRosterEntry } from "@chutai/game";
import roster from "../seed/daily-roster.json" with { type: "json" };

export const DAILY_ROSTER: Readonly<Record<string, Record<string, string>>> = roster;

/** Temas que têm desafio diário, na ordem do site. */
export const DAILY_THEME_SLUGS: readonly string[] = Object.keys(roster);

export function dailyRoster(slug: string): DailyRosterEntry[] | undefined {
  const entries = DAILY_ROSTER[slug];
  if (!entries) return undefined;
  return Object.entries(entries).map(([id, since]) => ({ id, since }));
}
