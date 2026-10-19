import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pacotes do monorepo são TypeScript puro; o Next compila junto com o site.
  transpilePackages: ["@chutai/shared", "@chutai/game", "@chutai/db"],
  // O driver do Postgres só roda no servidor e não deve ser empacotado.
  serverExternalPackages: ["postgres"],
  poweredByHeader: false,
};

export default nextConfig;
