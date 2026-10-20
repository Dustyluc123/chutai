/** Configuração lida das variáveis de ambiente (veja o .env.example na raiz). */
function number(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export interface Config {
  port: number;
  corsOrigins: string[];
  databaseUrl?: string;
  redisUrl?: string;
  /** Quanto tempo um jogador desconectado continua na sala do lobby antes de sair. */
  disconnectGraceMs: number;
  /** Sala sem ninguém conectado é apagada depois deste tempo. */
  emptyRoomTtlMs: number;
  /**
   * Endereço do site, de onde o servidor baixa as imagens originais dos personagens
   * para gerar as versões borradas do modo Imagem.
   */
  assetsBaseUrl: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: number(env.PORT, 3001),
    corsOrigins: (env.CORS_ORIGIN ?? "http://localhost:3000")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    databaseUrl: env.DATABASE_URL || undefined,
    redisUrl: env.REDIS_URL || undefined,
    disconnectGraceMs: number(env.DISCONNECT_GRACE_SECONDS, 20) * 1000,
    emptyRoomTtlMs: number(env.EMPTY_ROOM_MINUTES, 10) * 60_000,
    assetsBaseUrl: env.ASSETS_BASE_URL || "http://localhost:3000",
  };
}
