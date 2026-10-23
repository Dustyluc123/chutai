import { MemoryRoomStore } from "./memory";
import type { RoomStore } from "./types";
import { logger } from "../../lib/logger";

export type { RoomSnapshot, RoomStore } from "./types";
export { SNAPSHOT_VERSION, parseSnapshot } from "./types";
export { MemoryRoomStore } from "./memory";

/** Redis quando houver REDIS_URL; senão, memória. O Redis só é carregado se for usado. */
export async function createRoomStore(redisUrl?: string): Promise<RoomStore> {
  if (!redisUrl) return new MemoryRoomStore();
  const { RedisRoomStore } = await import("./redis");
  const store = new RedisRoomStore(redisUrl);
  // Chaves do formato antigo (chutai:room:*): apaga em segundo plano, sem travar a inicialização.
  void store
    .purgeLegacy()
    .then((count) => {
      if (count) logger.info(`${count} retrato(s) antigo(s) apagado(s) do Redis.`);
    })
    .catch((error) => logger.warn("Falha ao apagar retratos antigos do Redis", error));
  return store;
}
