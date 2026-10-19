import { MemoryRoomStore } from "./memory";
import type { RoomStore } from "./types";

export type { RoomSnapshot, RoomStore } from "./types";
export { MemoryRoomStore } from "./memory";

/** Redis quando houver REDIS_URL; senão, memória. O Redis só é carregado se for usado. */
export async function createRoomStore(redisUrl?: string): Promise<RoomStore> {
  if (!redisUrl) return new MemoryRoomStore();
  const { RedisRoomStore } = await import("./redis");
  return new RedisRoomStore(redisUrl);
}
