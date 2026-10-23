import { fileURLToPath } from "node:url";

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
  /** Id deste servidor como dono das salas no Redis. Padrão: aleatório a cada inicialização. */
  instanceId?: string;
  /** Quanto tempo um jogador desconectado continua na sala do lobby antes de sair. */
  disconnectGraceMs: number;
  /** Sala sem ninguém conectado é apagada depois deste tempo. */
  emptyRoomTtlMs: number;
  /**
   * Endereço do site, de onde o servidor baixa as imagens originais dos personagens
   * para gerar as versões borradas do modo Imagem.
   */
  assetsBaseUrl: string;
  /**
   * Pasta com as imagens dos temas oficiais (a `public` do site). O servidor lê dali primeiro e
   * só busca por HTTP (assetsBaseUrl) o que não encontrar no disco.
   */
  assetsDir: string;
}

/**
 * apps/web/public, calculado a partir deste arquivo. Funciona em desenvolvimento
 * (apps/realtime/src/config.ts) e no build (apps/realtime/dist/index.js): os dois estão
 * na mesma profundidade.
 */
const DEFAULT_ASSETS_DIR = fileURLToPath(new URL("../../web/public/", import.meta.url));

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: number(env.PORT, 3001),
    corsOrigins: (env.CORS_ORIGIN ?? "http://localhost:3000")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    databaseUrl: env.DATABASE_URL || undefined,
    redisUrl: env.REDIS_URL || undefined,
    // No Railway, cada deploy tem um id próprio (aparece nos logs e ajuda a achar quem é quem).
    instanceId: env.INSTANCE_ID || env.RAILWAY_DEPLOYMENT_ID || undefined,
    disconnectGraceMs: number(env.DISCONNECT_GRACE_SECONDS, 20) * 1000,
    emptyRoomTtlMs: number(env.EMPTY_ROOM_MINUTES, 10) * 60_000,
    assetsBaseUrl: env.ASSETS_BASE_URL || "http://localhost:3000",
    assetsDir: env.ASSETS_DIR || DEFAULT_ASSETS_DIR,
  };
}
