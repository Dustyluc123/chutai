import { Redis } from "ioredis";
import { parseSnapshot, type RoomSnapshot, type RoomStore } from "./types";

const SNAPSHOT = "chutai:sala:";
const LEASE = "chutai:dono:";
/** Prefixo do formato antigo (só o lobby, sem versão). Nunca é lido: é apagado ao ligar. */
const LEGACY = "chutai:room:";

/**
 * Scripts Lua rodam de uma vez no Redis (ninguém mexe na chave no meio): é isso que garante
 * que só o dono grava, renova ou solta a posse.
 */
const ACQUIRE = `
local current = redis.call('GET', KEYS[1])
if current and current ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[2])
return 1`;

const RENEW = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
redis.call('PEXPIRE', KEYS[1], ARGV[2])
redis.call('PEXPIRE', KEYS[2], ARGV[3])
return 1`;

const RELEASE = `
if redis.call('GET', KEYS[1]) == ARGV[1] then redis.call('DEL', KEYS[1]) end
return 1`;

const SAVE = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[2], ARGV[2], 'PX', ARGV[3])
return 1`;

const DELETE = `
local current = redis.call('GET', KEYS[1])
if current and current ~= ARGV[1] then return 0 end
redis.call('DEL', KEYS[1], KEYS[2])
return 1`;

/**
 * Usado quando existir REDIS_URL. Cada sala vira duas chaves:
 * - `chutai:sala:<código>`: o retrato em JSON, que expira se ninguém renovar (sala esquecida);
 * - `chutai:dono:<código>`: o id do servidor que é dono da sala, com validade curta.
 *
 * Isso basta para deploys (um servidor substituindo o outro). Para rodar VÁRIOS servidores ao
 * mesmo tempo de propósito, faltaria o @socket.io/redis-adapter e mandar cada sala sempre ao
 * servidor dono.
 */
export class RedisRoomStore implements RoomStore {
  readonly kind = "redis" as const;
  private readonly redis: Redis;

  constructor(urlOrClient: string | Redis) {
    this.redis =
      typeof urlOrClient === "string"
        ? // family 0: aceita IPv4 e IPv6 (a rede interna do Railway pode ser só IPv6).
          new Redis(urlOrClient, { maxRetriesPerRequest: 2, family: 0 })
        : urlOrClient;
  }

  async acquire(code: string, owner: string, ttlMs: number): Promise<boolean> {
    return (await this.redis.eval(ACQUIRE, 1, LEASE + code, owner, ttlMs)) === 1;
  }

  async renew(
    codes: string[],
    owner: string,
    ttlMs: number,
    snapshotTtlMs: number,
  ): Promise<string[]> {
    // Em paralelo: o ioredis manda tudo pela mesma conexão, sem esperar uma resposta por vez.
    const results = await Promise.allSettled(
      codes.map((code) =>
        this.redis.eval(RENEW, 2, LEASE + code, SNAPSHOT + code, owner, ttlMs, snapshotTtlMs),
      ),
    );
    // Erro de rede num item: não trata como posse perdida (tenta de novo na próxima renovação).
    return codes.filter((_, index) => {
      const result = results[index]!;
      return result.status === "fulfilled" && result.value === 0;
    });
  }

  async release(code: string, owner: string): Promise<void> {
    await this.redis.eval(RELEASE, 1, LEASE + code, owner);
  }

  async save(snapshot: RoomSnapshot, owner: string, snapshotTtlMs: number): Promise<boolean> {
    const saved = await this.redis.eval(
      SAVE,
      2,
      LEASE + snapshot.code,
      SNAPSHOT + snapshot.code,
      owner,
      JSON.stringify(snapshot),
      snapshotTtlMs,
    );
    return saved === 1;
  }

  async load(code: string): Promise<RoomSnapshot | undefined> {
    const raw = await this.redis.get(SNAPSHOT + code);
    if (raw === null) return undefined;
    const snapshot = parseSnapshot(raw);
    // Formato antigo, versão desconhecida ou quebrado: apaga e trata como sala inexistente.
    if (!snapshot) await this.redis.del(SNAPSHOT + code);
    return snapshot;
  }

  /** Apaga as chaves do formato antigo (`chutai:room:*`). Devolve quantas apagou. */
  async purgeLegacy(): Promise<number> {
    let cursor = "0";
    let removed = 0;
    do {
      const [next, keys] = await this.redis.scan(cursor, "MATCH", `${LEGACY}*`, "COUNT", 100);
      cursor = next;
      if (keys.length) removed += await this.redis.del(...keys);
    } while (cursor !== "0");
    return removed;
  }

  async exists(code: string): Promise<boolean> {
    return (await this.redis.exists(SNAPSHOT + code, LEASE + code)) > 0;
  }

  async delete(code: string, owner: string): Promise<void> {
    await this.redis.eval(DELETE, 2, LEASE + code, SNAPSHOT + code, owner);
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
