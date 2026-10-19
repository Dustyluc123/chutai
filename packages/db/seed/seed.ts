/**
 * Carrega os temas oficiais (JSON desta pasta) no PostgreSQL.
 *
 *   1. docker compose up -d          (sobe o Postgres local)
 *   2. pnpm db:migrate               (cria as tabelas)
 *   3. pnpm db:seed                  (este script)
 *
 * Pode rodar quantas vezes quiser: temas existentes são atualizados.
 */
import { getDatabase } from "../src/client";
import { upsertTheme } from "../src/repositories/themes";
import { OFFICIAL_THEMES, validateTheme } from "../src/themes";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Defina DATABASE_URL (veja o .env.example) antes de rodar o seed.");
    process.exit(1);
  }

  const db = getDatabase(url);
  for (const theme of OFFICIAL_THEMES) {
    const problems = validateTheme(theme);
    if (problems.length) {
      console.error(`Tema ${theme.slug} com problemas:\n- ${problems.join("\n- ")}`);
      process.exit(1);
    }
    await upsertTheme(db, theme);
    console.log(`✔ ${theme.name}: ${theme.characters.length} personagens`);
  }
  console.log("Seed concluído.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
