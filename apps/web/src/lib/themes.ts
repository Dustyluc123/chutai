import "server-only";
import { cache } from "react";
import { createRepositories, type Repositories } from "@chutai/db";

/**
 * Acesso aos temas no lado do servidor (Server Components e rotas /api).
 * Sem DATABASE_URL usa os JSON; com DATABASE_URL usa o PostgreSQL. Ninguém mais precisa saber.
 */
let repositories: Promise<Repositories> | undefined;

function repos() {
  repositories ??= createRepositories();
  return repositories;
}

export const listThemes = cache(async () => (await repos()).themes.listThemes());

export const getTheme = cache(async (slug: string) => (await repos()).themes.getTheme(slug));
