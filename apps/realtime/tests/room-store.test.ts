/**
 * O mesmo contrato para os dois stores: o de memória (testes e desenvolvimento) e o do Redis
 * (produção). O do Redis roda contra o ioredis-mock, que executa os scripts Lua de verdade;
 * com REDIS_TEST_URL, roda também num Redis real.
 */
import { afterAll, describe, expect, it } from "vitest";
import RedisMock from "ioredis-mock";
import { Redis } from "ioredis";
import type { Redis as RedisClient } from "ioredis";
import {
  MemoryRoomStore,
  SNAPSHOT_VERSION,
  type RoomSnapshot,
  type RoomStore,
} from "../src/rooms/store";
import { RedisRoomStore } from "../src/rooms/store/redis";

const snapshot = (code: string, phase: RoomSnapshot["phase"] = "lobby"): RoomSnapshot => ({
  version: SNAPSHOT_VERSION,
  code,
  themeSlug: "folclore-brasileiro",
  settings: {
    themeSlug: "folclore-brasileiro",
    mode: "classic",
    rounds: 3,
    roundSeconds: 90,
    hintsEnabled: true,
    maxPlayers: 8,
  },
  hostId: "a",
  createdAt: 1,
  players: [{ id: "a", nickname: "Ana", avatar: "🦜", token: "t", joinedAt: 1, score: 10 }],
  phase,
});

/** Cada store vem com um jeito de gravar texto cru (um retrato antigo ou quebrado). */
interface StoreCase {
  name: string;
  make: () => { store: RoomStore; putRaw: (code: string, raw: string) => Promise<void> };
}

const redisCase = (client: RedisClient) => () => ({
  store: new RedisRoomStore(client),
  putRaw: async (code: string, raw: string) => {
    await client.set(`chutai:sala:${code}`, raw);
  },
});

const stores: StoreCase[] = [
  {
    name: "memória",
    make: () => {
      const store = new MemoryRoomStore();
      return { store, putRaw: async (code, raw) => store.putRawForTests(code, raw) };
    },
  },
  { name: "Redis (mock)", make: redisCase(new RedisMock() as unknown as RedisClient) },
];
if (process.env.REDIS_TEST_URL) {
  stores.push({ name: "Redis real", make: redisCase(new Redis(process.env.REDIS_TEST_URL)) });
}

let counter = 0;
const code = () => `T${Date.now().toString(36).slice(-4).toUpperCase()}${counter++}`;

describe.each(stores)("store de salas: $name", ({ make }) => {
  const { store, putRaw } = make();
  afterAll(() => store.close());

  it.each([
    [
      "sem versão (formato antigo, só o lobby)",
      () => {
        const { version: _version, ...old } = snapshot("X");
        return JSON.stringify({ ...old, phase: undefined });
      },
    ],
    ["versão desconhecida", () => JSON.stringify({ ...snapshot("X"), version: 3 })],
    ["versão 1", () => JSON.stringify({ ...snapshot("X"), version: 1 })],
    ["JSON quebrado", () => '{"version":2,"code":'],
    [
      "campo faltando",
      () => {
        const { players: _players, ...broken } = snapshot("X");
        return JSON.stringify(broken);
      },
    ],
    [
      "rodada sem a resposta",
      () =>
        JSON.stringify({
          ...snapshot("X"),
          phase: "round",
          round: {
            number: 1,
            kind: "classic",
            startedAt: 1,
            endsAt: 2,
            solveCount: 0,
            players: [],
          },
        }),
    ],
  ])("ignora e apaga retrato %s, sem lançar erro", async (_label, raw) => {
    const c = code();
    await putRaw(c, raw());
    await expect(store.load(c)).resolves.toBeUndefined();
    expect(await store.exists(c)).toBe(false);
  });

  it("só um servidor consegue a posse; o mesmo dono renova", async () => {
    const c = code();
    expect(await store.acquire(c, "a", 10_000)).toBe(true);
    expect(await store.acquire(c, "b", 10_000)).toBe(false);
    expect(await store.acquire(c, "a", 10_000)).toBe(true);
  });

  it("só o dono grava, e soltar libera para outro", async () => {
    const c = code();
    await store.acquire(c, "a", 10_000);
    expect(await store.save(snapshot(c, "round"), "a", 60_000)).toBe(true);
    expect(await store.save(snapshot(c, "lobby"), "b", 60_000)).toBe(false);
    expect((await store.load(c))?.phase).toBe("round");

    await store.release(c, "b"); // quem não é dono não solta
    expect(await store.acquire(c, "b", 10_000)).toBe(false);
    await store.release(c, "a");
    expect(await store.acquire(c, "b", 10_000)).toBe(true);
    expect(await store.save(snapshot(c, "lobby"), "a", 60_000)).toBe(false);
  });

  it("renovar devolve as salas cuja posse foi perdida", async () => {
    const mine = code();
    const other = code();
    await store.acquire(mine, "a", 10_000);
    await store.acquire(other, "b", 10_000);
    expect(await store.renew([mine, other], "a", 10_000, 60_000)).toEqual([other]);
  });

  it("existe enquanto houver retrato ou posse; apagar remove os dois", async () => {
    const c = code();
    expect(await store.exists(c)).toBe(false);
    await store.acquire(c, "a", 10_000);
    expect(await store.exists(c)).toBe(true);
    await store.save(snapshot(c), "a", 60_000);
    await store.delete(c, "b"); // outro dono: não apaga
    expect(await store.load(c)).toBeDefined();
    await store.delete(c, "a");
    expect(await store.exists(c)).toBe(false);
    expect(await store.load(c)).toBeUndefined();
  });

  it("guarda o retrato inteiro em JSON", async () => {
    const c = code();
    await store.acquire(c, "a", 10_000);
    const saved = snapshot(c, "round");
    await store.save(saved, "a", 60_000);
    expect(await store.load(c)).toEqual(saved);
  });
});

describe("Redis: chaves do formato antigo", () => {
  it("apaga as chaves chutai:room:* ao ligar, sem mexer nas novas", async () => {
    const client = new RedisMock() as unknown as RedisClient;
    await client.set("chutai:room:ABC234", JSON.stringify({ code: "ABC234", players: [] }));
    await client.set("chutai:room:XYZ789", "lixo");
    await client.set("chutai:sala:NOVA22", JSON.stringify(snapshot("NOVA22")));
    const store = new RedisRoomStore(client);
    expect(await store.purgeLegacy()).toBe(2);
    expect(await client.keys("chutai:room:*")).toEqual([]);
    expect((await store.load("NOVA22"))?.code).toBe("NOVA22");
  });
});
