import { defineConfig } from "drizzle-kit";

/**
 * Configuração do drizzle-kit.
 * - `pnpm db:generate` cria um arquivo SQL em ./migrations a partir de src/schema.ts (não precisa de banco).
 * - `pnpm db:migrate` aplica as migrações no banco de DATABASE_URL.
 */
export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://chutai:chutai@localhost:5432/chutai",
  },
  strict: true,
  verbose: true,
});
