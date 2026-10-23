/**
 * O mesmo contrato para os dois stores: o de memória (testes e desenvolvimento) e o do Redis
 * (produção). O do Redis roda contra o ioredis-mock, que executa os scripts Lua de verdade;
 * com REDIS_TEST_URL, roda também num Redis real.
 */
import { afterAll, describe, expect, it } from "vitest";
import RedisMock from "ioredis-mock";
import { Redis } from "ioredis";
import type { Redis as RedisClient } from "ioredis";
import { MemoryRoomStore, type RoomSnapshot, type RoomStore } from "../src/rooms/store";
import { RedisRoomStore } from "../src/rooms/store/redis";

const snapshot = (code: string, phase: RoomSnapshot["phase"] = "lobby"): RoomSnapshot => ({
  version: 2,
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

const stores: { name: string; make: () => RoomStore }[] = [
  { name: "memória", make: () => new MemoryRoomStore() },
  {
    name: "Redis (mock)",
    make: () => new RedisRoomStore(new RedisMock() as unknown as RedisClient),
  },
];
if (process.env.REDIS_TEST_URL) {
  stores.push({
    name: "Redis real",
    make: () => new RedisRoomStore(new Redis(process.env.REDIS_TEST_URL!)),
  });
}

let counter = 0;
const code = () => `T${Date.now().toString(36).slice(-4).toUpperCase()}${counter++}`;

describe.each(stores)("store de salas: $name", ({ make }) => {
  const store = make();
  afterAll(() => store.close());

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
