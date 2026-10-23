/** Salas grandes (lives): 30 jogadores, envio do estado agrupado e 30 conexões chutando juntas. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { io as connect, type Socket } from "socket.io-client";
import type {
  Ack,
  ClientToServerEvents,
  JoinedRoom,
  RoomState,
  ServerToClientEvents,
} from "@chutai/shared";
import { LIMITS, updateSettingsSchema } from "@chutai/shared";
import { TIMING } from "@chutai/game";
import { GameError } from "../src/lib/errors";
import { createRealtimeServer, type RealtimeServer } from "../src/app";
import { loadConfig } from "../src/config";
import { createTestRoom, wrongCharacter } from "./helpers";

describe("sala com 30 jogadores", () => {
  it("o limite vai até 30 e o padrão continua 8", () => {
    expect(LIMITS.maxPlayers.max).toBe(30);
    expect(updateSettingsSchema.safeParse({ maxPlayers: 30 }).success).toBe(true);
    expect(updateSettingsSchema.safeParse({ maxPlayers: 31 }).success).toBe(false);

    const { room } = createTestRoom({ maxPlayers: 30 });
    for (let i = 0; i < 30; i++) room.addPlayer(`Jogador ${i + 1}`, "🦜");
    expect(room.players.size).toBe(30);
    expect(() => room.addPlayer("Sobrando", "🦜")).toThrow(GameError);
  });

  it("chutes juntos viram um envio só do estado; mudança de fase sai na hora", () => {
    const { room, clock, sent } = createTestRoom(
      { maxPlayers: 30, rounds: 2 },
      { stateBroadcastMs: TIMING.stateBroadcastMs },
    );
    const players = Array.from({ length: 30 }, (_, i) => room.addPlayer(`J${i + 1}`, "🦜"));
    room.start(players[0]!.id);
    const answer = room.peekAnswerForTests()!;
    const wrong = wrongCharacter(room);
    const states = () => sent.filter((item) => item.event === "room:state").length;

    const before = states();
    for (const player of players.slice(0, 29)) room.guess(player.id, wrong.id);
    // Nada ainda: os 29 chutes esperam o envio agrupado.
    expect(states()).toBe(before);
    clock.advance(TIMING.stateBroadcastMs);
    expect(states()).toBe(before + 1);
    const latest = sent.filter((item) => item.event === "room:state").at(-1)!.args[0] as RoomState;
    expect(latest.round?.progress.filter((p) => p.guessCount === 1)).toHaveLength(29);

    // O placar de progresso individual continua saindo a cada chute.
    expect(sent.filter((item) => item.event === "player:progress").length).toBeGreaterThanOrEqual(
      29,
    );

    // Todos acertam: o fim da rodada sai na hora, sem esperar.
    const beforeEnd = states();
    for (const player of players) room.guess(player.id, answer.id);
    expect(room.phase).toBe("intermission");
    expect(states()).toBe(beforeEnd + 1);
    clock.advance(TIMING.stateBroadcastMs);
    expect(states()).toBe(beforeEnd + 1); // o envio pendente foi junto com o da fase
  });
});

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

describe("30 conexões chutando ao mesmo tempo", () => {
  let server: RealtimeServer;
  let url: string;
  const clients: Client[] = [];

  beforeAll(async () => {
    server = await createRealtimeServer(
      { ...loadConfig({}), databaseUrl: undefined, redisUrl: undefined },
      { countdownMs: 0 },
    );
    url = `http://localhost:${await server.listen(0)}`;
  });

  afterAll(async () => {
    for (const client of clients) client.disconnect();
    await server.close();
  });

  const client = () =>
    new Promise<Client>((resolve) => {
      const socket: Client = connect(url, { transports: ["websocket"], forceNew: true });
      clients.push(socket);
      socket.on("connect", () => resolve(socket));
    });
  const unwrap = <T>(response: Ack<T>): T => {
    if (!response.ok) throw new Error(response.error);
    return response.data;
  };

  it("ninguém é barrado pelo limite de ações e todos recebem o estado", async () => {
    const host = await client();
    const created: JoinedRoom = unwrap(
      await host.emitWithAck("room:create", {
        nickname: "Streamer",
        avatar: "🎸",
        settings: {
          maxPlayers: 30,
          rounds: 1,
          roundSeconds: 120,
          themeSlug: "folclore-brasileiro",
        },
      }),
    );
    const others = await Promise.all(Array.from({ length: 29 }, () => client()));
    await Promise.all(
      others.map((socket, i) =>
        socket
          .emitWithAck("room:join", { code: created.code, nickname: `Chat ${i + 1}`, avatar: "🦜" })
          .then(unwrap),
      ),
    );
    const everyone = [host, ...others];
    unwrap(await host.emitWithAck("game:start"));

    const room = server.manager.get(created.code)!;
    expect(room.players.size).toBe(30);
    const wrong = room.theme.characters.filter((c) => c.id !== room.peekAnswerForTests()!.id);

    // Cada um manda 3 chutes errados de uma vez (rajada dentro do limite por conexão).
    const finalStates = everyone.map(
      (socket) =>
        new Promise<RoomState>((resolve) => {
          const handler = (state: RoomState) => {
            const total = state.round?.progress.reduce((sum, p) => sum + p.guessCount, 0) ?? 0;
            if (total === 90) {
              socket.off("room:state", handler);
              resolve(state);
            }
          };
          socket.on("room:state", handler);
        }),
    );
    const acks = await Promise.all(
      everyone.flatMap((socket) =>
        wrong.slice(0, 3).map((c) => socket.emitWithAck("guess:submit", { characterId: c.id })),
      ),
    );
    expect(acks.every((ack) => ack.ok)).toBe(true);
    const states = await Promise.all(finalStates);
    expect(states.every((state) => state.players.length === 30)).toBe(true);
  });
});
