import path from "node:path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  // Pacotes do monorepo são TypeScript puro; o Next compila junto com o site.
  transpilePackages: ["@chutai/shared", "@chutai/game", "@chutai/db"],
  // O driver do Postgres só roda no servidor e não deve ser empacotado.
  serverExternalPackages: ["postgres"],
  poweredByHeader: false,
  // As imagens dos personagens já são .webp pequenos (300×300, ~11 KB): vão direto, sem a
  // otimização de imagens da Vercel (o plano Hobby só inclui 5 mil transformações por mês).
  images: { unoptimized: true },
  // Imagens dos temas em cache no navegador por 1 dia (o padrão faria o navegador perguntar de
  // novo à Vercel a cada visita, e cada pergunta conta no limite de requisições do plano).
  async headers() {
    return [
      {
        source: "/temas/:slug/:image(.+\\.webp)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
    ];
  },
  // Raiz do monorepo: o build (local ou na Vercel) precisa enxergar os pacotes de ../../packages.
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
  // Fontes das imagens geradas (prévia do link e pódio), lidas do disco em tempo de execução.
  outputFileTracingIncludes: { "/**": ["./src/assets/og/*.ttf"] },
};

/**
 * Sentry: só entra no build quando existe NEXT_PUBLIC_SENTRY_DSN. Com SENTRY_AUTH_TOKEN (opcional,
 * secreto), também envia os mapas do código para os erros aparecerem com o código original.
 */
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: { disable: process.env.SENTRY_AUTH_TOKEN ? false : "disable-upload" },
      silent: !process.env.CI,
      telemetry: false,
    })
  : nextConfig;
