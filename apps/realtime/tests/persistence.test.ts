/**
 * Salas que sobrevivem a reinícios: retrato completo no store, cronômetros pelo horário salvo,
 * posse (só um servidor por sala) e jogadores reconectando pelo token depois do deploy.
 */
import { afterEach, describe, expect, it } from "vitest";
import { io as connect, type Socket } from "socket.io-client";
import type {
  Ack,
  ClientToServerEvents,
  GuessResult,
  PrivateState,
  RoomState,
  ServerToClientEvents,
} from "@chutai/shared";
import { createRepositories } from "@chutai/db";
import { Room, type RoomEmitter } from "../src/rooms/Room";
import { LEASE_MS, RoomManager } from "../src/rooms/RoomManager";
import { MemoryRoomStore } from "../src/rooms/store";
import type { RoomSnapshot } from "../src/rooms/store";
import { MatchService } from "../src/services/matchService";
import { ThemeService } from "../src/services/themeService";
import { createRealtimeServer, type RealtimeServer } from "../src/app";
import { loadConfig } from "../src/config";
import { GameError } from "../src/lib/errors";
import {
  FakeClock,
  createTestRoom,
  fakeRenderer,
  flush,
  imageTheme,
  theme,
  wrongCharacter,
} from "./helpers";

/** Sala nova (como num servidor recém-ligado) restaurada a partir de um retrato. */
function restored(
  snapshot: RoomSnapshot,
  clock: FakeClock,
  extra: { render?: typeof fakeRenderer } = {},
) {
  const sent: { event: string; args: unknown[] }[] = [];
  const emitter: RoomEmitter = {
    broadcast: (event, ...args) => sent.push({ event, args }),
    toPlayer: (_id, event, ...args) => sent.push({ event, args }),
  };
  const seeds: number[] = [];
  const room = new Room(
    snapshot.code,
    snapshot.themeSlug === imageTheme.slug ? imageTheme : theme,
    snapshot.settings,
    {
      emitter,
      now: clock.now,
      schedule: clock.schedule,
      random: () => 0,
      disconnectGraceMs: 5_000,
      intermissionMs: 3_000,
      countdownMs: 0,
      renderRoundImages: extra.render
        ? (character, seed) => {
            seeds.push(seed);
            return extra.render!();
          }
        : undefined,
    },
  );
  // O retrato passa por JSON, como no Redis.
  room.restoreFrom(JSON.parse(JSON.stringify(snapshot)) as RoomSnapshot);
  return { room, sent, seeds };
}

describe("retrato da sala no meio da rodada", () => {
  it("restaura fase, chutes, pontos e o horário de término da rodada", () => {
    const { room, clock } = createTestRoom({ rounds: 3 });
    const ana = room.addPlayer("Ana", "🦜");
    const bia = room.addPlayer("Bia", "🐆");
    room.start(ana.id);
    const answer = room.peekAnswerForTests()!;
    const wrong = wrongCharacter(room);
    clock.advance(10_000);
    room.guess(ana.id, wrong.id);
    room.guess(bia.id, answer.id);
    const before = room.toPublicState();

    clock.advance(4_000); // servidor fora do ar por 4 s
    const { room: next } = restored(room.toSnapshot(), clock);

    expect(next.phase).toBe("round");
    expect(next.peekAnswerForTests()?.id).toBe(answer.id);
    expect(next.toPublicState().round?.endsAt).toBe(before.round?.endsAt);
    expect(next.players.get(bia.id)?.score).toBe(room.players.get(bia.id)?.score);
    expect(next.privateState(ana.id).guesses.map((g) => g.characterId)).toEqual([wrong.id]);
    expect(next.privateState(bia.id).solved).toBe(true);
    // Todos voltam desconectados e reconectam pelo token.
    expect(next.connectedPlayers).toHaveLength(0);
    expect(next.findByToken(ana.token)?.id).toBe(ana.id);
    // Quem já chutou um personagem não pode chutar de novo depois do reinício.
    next.setConnected(ana.id, true);
    expect(() => next.guess(ana.id, wrong.id)).toThrow(GameError);
  });

  it("o cronômetro continua pelo horário salvo, não do zero", () => {
    const { room, clock } = createTestRoom({ rounds: 2, roundSeconds: 60 });
    const ana = room.addPlayer("Ana", "🦜");
    room.start(ana.id);
    clock.advance(50_000);

    const { room: next } = restored(room.toSnapshot(), clock);
    next.setConnected(ana.id, true);
    clock.advance(9_999);
    expect(next.phase).toBe("round");
    clock.advance(1);
    expect(next.phase).toBe("intermission");
    // O intervalo também segue o horário salvo e a rodada 2 começa no fim dele.
    clock.advance(3_000);
    expect(next.phase).toBe("round");
    expect(next.toPublicState().round?.number).toBe(2);
  });

  it("rodada que venceu enquanto o servidor estava fora termina na hora", () => {
    const { room, clock } = createTestRoom({ rounds: 2, roundSeconds: 60 });
    const ana = room.addPlayer("Ana", "🦜");
    room.start(ana.id);
    const answer = room.peekAnswerForTests()!;
    const snapshot = room.toSnapshot();

    clock.advance(70_000);
    const { room: next, sent } = restored(snapshot, clock);
    expect(next.phase).toBe("intermission");
    expect(sent.some((item) => item.event === "round:end")).toBe(true);
    expect(next.toPublicState().lastRound?.character.id).toBe(answer.id);
  });

  it("intervalo e contagem seguem o horário de término salvo", () => {
    const { room, clock } = createTestRoom({ rounds: 2 }, { countdownMs: 5_000 });
    const ana = room.addPlayer("Ana", "🦜");
    room.start(ana.id);
    clock.advance(2_000);
    const { room: next } = restored(room.toSnapshot(), clock);
    next.setConnected(ana.id, true);
    expect(next.phase).toBe("countdown");
    clock.advance(2_999);
    expect(next.phase).toBe("countdown");
    clock.advance(1);
    expect(next.phase).toBe("round");
  });

  it("pódio e histórico sobrevivem (a imagem de compartilhar continua funcionando)", () => {
    const { room } = createTestRoom({ rounds: 1 });
    const ana = room.addPlayer("Ana", "🦜");
    room.start(ana.id);
    room.guess(ana.id, room.peekAnswerForTests()!.id);
    expect(room.phase).toBe("finished");

    const { room: next } = restored(room.toSnapshot(), new FakeClock());
    expect(next.phase).toBe("finished");
    expect(next.toResult()).toEqual(room.toResult());
  });

  it("não sorteia de novo um personagem que já saiu na partida", () => {
    const { room, clock } = createTestRoom({ rounds: 3 });
    const ana = room.addPlayer("Ana", "🦜");
    room.start(ana.id);
    const first = room.peekAnswerForTests()!;
    room.guess(ana.id, first.id);
    const { room: next } = restored(room.toSnapshot(), clock);
    next.setConnected(ana.id, true);
    clock.advance(3_000);
    expect(next.phase).toBe("round");
    expect(next.peekAnswerForTests()?.id).not.toBe(first.id);
  });

  it("modo Imagem: gera as imagens de novo com a mesma semente", async () => {
    const seeds: number[] = [];
    const { room } = createTestRoom(
      { mode: "image", rounds: 2 },
      {
        theme: imageTheme,
        renderRoundImages: async (_character, seed) => {
          seeds.push(seed);
          return fakeRenderer();
        },
      },
    );
    const ana = room.addPlayer("Ana", "🦜");
    room.start(ana.id);
    await flush();

    const {
      room: next,
      seeds: again,
      sent,
    } = restored(room.toSnapshot(), new FakeClock(), {
      render: fakeRenderer,
    });
    await flush();
    expect(again).toEqual(seeds);
    next.setConnected(ana.id, true);
    next.sendRoundImage(ana.id);
    expect(sent.some((item) => item.event === "round:image")).toBe(true);
    expect(next.privateState(ana.id).image?.status).toBe("ready");
  });

  it("retrato antigo (só lobby) ou com personagem que saiu do tema volta para o lobby", () => {
    const { room } = createTestRoom();
    const ana = room.addPlayer("Ana", "🦜");
    room.start(ana.id);
    const snapshot = room.toSnapshot();

    const removed = { ...snapshot, round: { ...snapshot.round!, characterId: "nao-existe" } };
    expect(restored(removed, new FakeClock()).room.phase).toBe("lobby");

    const { phase: _phase, round: _round, version: _version, ...old } = snapshot;
    const legacy = restored(old as RoomSnapshot, new FakeClock()).room;
    expect(legacy.phase).toBe("lobby");
    expect(legacy.players.get(ana.id)?.score).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Dois servidores dividindo o mesmo store (o Redis num deploy)
// ---------------------------------------------------------------------------

async function managerOn(store: MemoryRoomStore, instanceId: string) {
  const repositories = await createRepositories(undefined);
  return new RoomManager({
    store,
    matches: new MatchService(repositories.matches),
    themes: new ThemeService(repositories.themes),
    emitterFor: () => ({ broadcast: () => {}, toPlayer: () => {} }),
    disconnectGraceMs: 20_000,
    emptyRoomTtlMs: 600_000,
    countdownMs: 0,
    instanceId,
    acquireRetryMs: 5,
    acquireWaitMs: 50,
  });
}

describe("posse da sala entre dois servidores", () => {
  const managers: RoomManager[] = [];
  afterEach(async () => {
    for (const manager of managers.splice(0)) await manager.close();
  });

  async function startedRoom(store: MemoryRoomStore) {
    const old = await managerOn(store, "antigo");
    managers.push(old);
    const room = await old.create(theme, {
      themeSlug: theme.slug,
      mode: "classic",
      rounds: 3,
      roundSeconds: 90,
      hintsEnabled: true,
      maxPlayers: 8,
    });
    const ana = room.addPlayer("Ana", "🦜");
    room.start(ana.id);
    room.guess(ana.id, wrongCharacter(room).id);
    await old.flush();
    return { old, room, ana };
  }

  it("o servidor novo espera o antigo soltar a sala e continua a mesma rodada", async () => {
    const store = new MemoryRoomStore();
    const { old, room, ana } = await startedRoom(store);
    const fresh = await managerOn(store, "novo");
    managers.push(fresh);

    // Durante o deploy, o antigo ainda é o dono: o novo não abre uma segunda rodada.
    await expect(fresh.load(room.code)).rejects.toThrow(/mudando de servidor/);
    expect(await fresh.load(room.code, { wait: false })).toBeUndefined();

    // SIGTERM no antigo: salva e solta.
    const endsAt = room.toPublicState().round!.endsAt;
    expect(await old.shutdown()).toBe(1);
    expect(old.get(room.code)).toBeUndefined();

    const moved = (await fresh.load(room.code))!;
    expect(moved.phase).toBe("round");
    expect(moved.toPublicState().round?.endsAt).toBe(endsAt);
    expect(moved.findByToken(ana.token)?.id).toBe(ana.id);
    expect(moved.privateState(ana.id).guesses).toHaveLength(1);
  });

  it("depois de soltar a sala, o antigo não consegue mais gravar por cima", async () => {
    const store = new MemoryRoomStore();
    const { old, room } = await startedRoom(store);
    const snapshot = room.toSnapshot();
    await old.shutdown();
    const fresh = await managerOn(store, "novo");
    managers.push(fresh);
    await fresh.load(room.code);

    expect(await store.save({ ...snapshot, phase: "lobby" }, "antigo", 60_000)).toBe(false);
    expect((await store.load(room.code))?.phase).toBe("round");
  });

  it("se o antigo cair sem avisar, a posse vence e o novo assume", async () => {
    let now = 1_000_000;
    const store = new MemoryRoomStore(() => now);
    const { room } = await startedRoom(store);
    const fresh = await managerOn(store, "novo");
    managers.push(fresh);

    await expect(fresh.load(room.code)).rejects.toThrow(GameError);
    now += LEASE_MS + 1;
    expect((await fresh.load(room.code))?.phase).toBe("round");
  });

  it("sala que saiu do servidor antigo por perder a posse não roda mais lá", async () => {
    let now = 1_000_000;
    const store = new MemoryRoomStore(() => now);
    const { old, room } = await startedRoom(store);
    now += LEASE_MS + 1;
    const fresh = await managerOn(store, "novo");
    managers.push(fresh);
    await fresh.load(room.code);

    await old.renew();
    expect(old.get(room.code)).toBeUndefined();
  });

  it("sala encerrada some do store; sala esquecida expira sozinha", async () => {
    let now = 1_000_000;
    const store = new MemoryRoomStore(() => now);
    const { old, room } = await startedRoom(store);
    old.delete(room.code);
    await old.flush();
    expect(await store.exists(room.code)).toBe(false);

    const second = await startedRoom(store);
    await second.old.shutdown();
    expect(await store.exists(second.room.code)).toBe(true);
    now += 600_001; // EMPTY_ROOM_MINUTES sem ninguém renovar
    expect(await store.exists(second.room.code)).toBe(false);
  });

  it("não repete código de sala que ainda está no store", async () => {
    const store = new MemoryRoomStore();
    const taken = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const { room } = await startedRoom(store);
      expect(taken.has(room.code)).toBe(false);
      taken.add(room.code);
    }
  });
});

// ---------------------------------------------------------------------------
// De ponta a ponta: deploy com um jogador de verdade conectado
// ---------------------------------------------------------------------------

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

function unwrap<T>(response: Ack<T>): T {
  if (!response.ok) throw new Error(response.error);
  return response.data;
}

describe("deploy com jogadores conectados", () => {
  const servers: RealtimeServer[] = [];
  const clients: Client[] = [];
  afterEach(async () => {
    for (const client of clients.splice(0)) client.disconnect();
    for (const server of servers.splice(0)) await server.close().catch(() => undefined);
  });

  async function serverOn(store: MemoryRoomStore, instanceId: string) {
    const server = await createRealtimeServer(
      { ...loadConfig({}), databaseUrl: undefined, redisUrl: undefined },
      { store, instanceId, countdownMs: 0, imageLoader: async () => Buffer.alloc(0) },
    );
    servers.push(server);
    const port = await server.listen(0);
    return { server, url: `http://localhost:${port}` };
  }

  function client(url: string): Promise<Client> {
    return new Promise((resolve) => {
      const socket: Client = connect(url, { transports: ["websocket"], forceNew: true });
      clients.push(socket);
      socket.on("connect", () => resolve(socket));
    });
  }

  it("o jogador reconecta no servidor novo sem perder pontos nem chutes", async () => {
    const store = new MemoryRoomStore();
    const old = await serverOn(store, "antigo");
    const ana = await client(old.url);
    const created = unwrap(
      await ana.emitWithAck("room:create", {
        nickname: "Ana",
        avatar: "🦜",
        settings: { rounds: 3, roundSeconds: 90, themeSlug: theme.slug },
      }),
    );
    unwrap(await ana.emitWithAck("game:start"));
    const room = old.server.manager.get(created.code)!;
    const answer = room.peekAnswerForTests()!;
    const wrong = wrongCharacter(room);
    const miss: GuessResult = unwrap(
      await ana.emitWithAck("guess:submit", { characterId: wrong.id }),
    );
    expect(miss.correct).toBe(false);
    const endsAt = room.toPublicState().round!.endsAt;

    // Deploy: o servidor antigo recebe SIGTERM; o navegador perde a conexão.
    const dropped = new Promise((resolve) => ana.once("disconnect", resolve));
    await old.server.shutdown();
    await dropped;

    const fresh = await serverOn(store, "novo");
    const back = await client(fresh.url);
    const privateState = new Promise<PrivateState>((resolve) => back.once("you:state", resolve));
    const publicState = new Promise<RoomState>((resolve) => back.once("room:state", resolve));
    const rejoined = unwrap(
      await back.emitWithAck("room:join", {
        code: created.code,
        nickname: "Ana",
        avatar: "🦜",
        token: created.token,
      }),
    );
    expect(rejoined.playerId).toBe(created.playerId);
    expect((await privateState).guesses.map((g) => g.characterId)).toEqual([wrong.id]);
    const state = await publicState;
    expect(state.phase).toBe("round");
    expect(state.round?.endsAt).toBe(endsAt);
    expect(state.players).toHaveLength(1);

    // E a partida segue: o acerto vale pontos no servidor novo.
    const hit: GuessResult = unwrap(
      await back.emitWithAck("guess:submit", { characterId: answer.id }),
    );
    expect(hit.correct).toBe(true);
    expect(
      fresh.server.manager.get(created.code)!.players.get(created.playerId)!.score,
    ).toBeGreaterThan(0);
  });
});
