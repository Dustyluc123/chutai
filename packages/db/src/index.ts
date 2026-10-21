/**
 * Ponto de entrada do pacote de banco.
 *
 * Hoje (sem banco): temas vêm dos JSON e partidas ficam na memória.
 * Futuro (com DATABASE_URL): `createRepositories()` passa a usar PostgreSQL
 * automaticamente — o site e o servidor não precisam mudar nada.
 */
import { JsonThemeRepository, DrizzleThemeRepository } from "./repositories/themes";
import { MemoryMatchRepository, DrizzleMatchRepository } from "./repositories/matches";
import type { MatchRepository, ThemeRepository } from "./repositories/types";

export * from "./themes";
export * from "./repositories/types";
export {
  JsonThemeRepository,
  DrizzleThemeRepository,
  MemoryMatchRepository,
  DrizzleMatchRepository,
};
export { upsertTheme } from "./repositories/themes";

export interface Repositories {
  mode: "json" | "postgres";
  themes: ThemeRepository;
  matches: MatchRepository;
}

/**
 * Escolhe a implementação conforme o ambiente.
 * O driver do Postgres só é carregado (import dinâmico) quando existe DATABASE_URL.
 */
export async function createRepositories(
  databaseUrl: string | undefined = process.env.DATABASE_URL,
): Promise<Repositories> {
  if (!databaseUrl) {
    return {
      mode: "json",
      themes: new JsonThemeRepository(),
      matches: new MemoryMatchRepository(),
    };
  }

  const { getDatabase } = await import("./client");
  const db = getDatabase(databaseUrl);
  return {
    mode: "postgres",
    themes: new DrizzleThemeRepository(db),
    matches: new DrizzleMatchRepository(db),
  };
}
export * from "./daily";
