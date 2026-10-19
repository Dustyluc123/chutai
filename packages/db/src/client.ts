/**
 * Conexão com o PostgreSQL. Só é usada quando DATABASE_URL existe.
 * Importe este arquivo apenas no servidor (nunca em componentes do navegador).
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function createDatabase(url: string) {
  const sql = postgres(url, { max: 10, prepare: false });
  return drizzle(sql, { schema });
}

export type PostgresDatabase = ReturnType<typeof createDatabase>;

let cached: PostgresDatabase | undefined;

/** Reaproveita uma única conexão por processo. */
export function getDatabase(url = process.env.DATABASE_URL): PostgresDatabase {
  if (!url) throw new Error("DATABASE_URL não definida. Veja o .env.example.");
  cached ??= createDatabase(url);
  return cached;
}
