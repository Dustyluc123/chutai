import { Redis } from "ioredis";
import type { RoomSnapshot, RoomStore } from "./types";

const PREFIX = "chutai:room:";
/** Salas esquecidas expiram sozinhas depois de 6 horas. */
const TTL_SECONDS = 6 * 60 * 60;

/**
 * Usado quando existir REDIS_URL. Guarda um retrato de cada sala para que
 * um reinício do servidor (deploy, queda) não derrube as salas.
 *
 * Próximo passo para rodar VÁRIOS servidores ao mesmo tempo:
 * instalar @socket.io/redis-adapter e chamar `io.adapter(createAdapter(pub, sub))`
 * em src/app.ts, além de direcionar cada sala sempre ao mesmo servidor
 * (ou mover o estado da rodada inteiro para o Redis).
 */
export class RedisRoomStore implements RoomStore {
  readonly kind = "redis" as const;
  private readonly redis: Redis;

  constructor(url: string) {
    this.redis = new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 2 });
  }

  async save(snapshot: RoomSnapshot): Promise<void> {
    await this.redis.set(PREFIX + snapshot.code, JSON.stringify(snapshot), "EX", TTL_SECONDS);
  }

  async delete(code: string): Promise<void> {
    await this.redis.del(PREFIX + code);
  }

  async loadAll(): Promise<RoomSnapshot[]> {
    const snapshots: RoomSnapshot[] = [];
    let cursor = "0";
    do {
      const [next, keys] = await this.redis.scan(cursor, "MATCH", `${PREFIX}*`, "COUNT", 100);
      cursor = next;
      if (keys.length) {
        const values = await this.redis.mget(...keys);
        for (const value of values) {
          if (value) snapshots.push(JSON.parse(value) as RoomSnapshot);
        }
      }
    } while (cursor !== "0");
    return snapshots;
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
