import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { RoomSettings, Theme, ThemeSummary } from "@chutai/shared";
import type * as schema from "../schema";

/** Qualquer banco Drizzle com o nosso schema (postgres-js em produção, PGlite nos testes). */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

/**
 * De onde vêm os temas. O resto do sistema só conhece esta interface,
 * então trocar JSON por PostgreSQL não muda nada no site nem no servidor.
 */
export interface ThemeRepository {
  /** Temas que aparecem na lista pública (oficiais + públicos aprovados). */
  listThemes(): Promise<ThemeSummary[]>;
  getTheme(slug: string): Promise<Theme | null>;
}

/** Resumo de uma partida terminada, pronto para virar histórico. */
export interface MatchRecord {
  themeSlug: string;
  roomCode: string;
  startedAt: Date;
  finishedAt: Date;
  settings: RoomSettings;
  players: {
    /** Identificador do jogador dentro da partida (o id da sala). */
    key: string;
    nickname: string;
    avatar: string;
    points: number;
    position: number;
  }[];
  rounds: {
    number: number;
    characterId: string;
    guesses: { playerKey: string; characterId: string; timeMs: number; order: number }[];
  }[];
}

export interface MatchRepository {
  save(record: MatchRecord): Promise<void>;
}
