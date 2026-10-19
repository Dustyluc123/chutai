import { defineConfig } from "tsup";

/**
 * Gera um único arquivo dist/index.js com os pacotes do monorepo embutidos
 * (@chutai/*), pronto para rodar com `node` em qualquer hospedagem.
 */
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  platform: "node",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  noExternal: [/^@chutai\//],
});
