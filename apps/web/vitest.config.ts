import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Testes de componentes do site (React + jsdom). */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
