/**
 * Teste de ponta a ponta: sobe o servidor real numa porta livre, conecta dois
 * "navegadores" com socket.io-client e joga uma partida inteira.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { io as connect, type Socket } from "socket.io-client";
import type {
  Ack,
  ClientToServerEvents,
  GuessResult,
  JoinedRoom,
  PrivateState,
  RoomState,
  RoundImage,
  ServerToClientEvents,
} from "@chutai/shared";
import { createRealtimeServer, type RealtimeServer } from "../src/app";
import { loadConfig } from "../src/config";
import { containsProfanity } from "../src/lib/profanity";
import { TokenBucket } from "../src/socket/middleware/rateLimit";

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

let server: RealtimeServer;
let url: string;
const clients: Client[] = [];

beforeAll(async () => {
  server = await createRealtimeServer(
    { ...loadConfig({}), databaseUrl: undefined, redisUrl: undefined },
    {
      intermissionMs: 200,
      countdownMs: 100,
      // Lê as imagens direto da pasta pública do site, sem precisar do Next rodando.
      imageLoader: (image) =>
        readFile(fileURLToPath(new URL(`../../web/public${image}`, import.meta.url))),
    },
  );
  const port = await server.listen(0);
  url = `http://localhost:${port}`;
});

afterAll(async () => {
  for (const client of clients) client.disconnect();
  await server.close();
});

function client(): Promise<Client> {
  return new Promise((resolve) => {
    const socket: Client = connect(url, { transports: ["websocket"], forceNew: true });
    clients.push(socket);
    socket.on("connect", () => resolve(socket));
  });
}

function nextState(socket: Client, predicate: (state: RoomState) => boolean): Promise<RoomState> {
  return new Promise((resolve) => {
    const handler = (state: RoomState) => {
      if (!predicate(state)) return;
      socket.off("room:state", handler);
      resolve(state);
    };
    socket.on("room:state", handler);
  });
}

function unwrap<T>(response: Ack<T>): T {
  if (!response.ok) throw new Error(response.error);
  return response.data;
}

describe("servidor de tempo real", () => {
  it("responde a /health e /themes", async () => {
    const health = await fetch(`${url}/health`).then((r) => r.json());
    expect(health).toMatchObject({ ok: true, data: "json", roomStore: "memory" });
    const themes = (await fetch(`${url}/themes`).then((r) => r.json())) as unknown[];
    expect(themes.length).toBeGreaterThanOrEqual(3);
  });

  it("joga uma partida completa com dois jogadores", async () => {
    const ana = await client();
    const bia = await client();

    const created = unwrap(
      await ana.emitWithAck("room:create", {
        nickname: "Ana",
        avatar: "🦜",
        settings: { rounds: 1, roundSeconds: 60, themeSlug: "fauna-brasileira" },
      }),
    );
    expect(created.code).toMatch(/^[A-Z0-9]{6}$/);

    const lobby = nextState(ana, (s) => s.players.length === 2);
    const joined: JoinedRoom = unwrap(
      await bia.emitWithAck("room:join", { code: created.code, nickname: "Bia", avatar: "🐆" }),
    );
    expect((await lobby).theme.slug).toBe("fauna-brasileira");

    // Bia não é anfitriã: não pode começar.
    expect(await bia.emitWithAck("game:start")).toMatchObject({ ok: false });

    const started = nextState(bia, (s) => s.phase === "round");
    unwrap(await ana.emitWithAck("game:start"));
    await started;

    const room = server.manager.get(created.code)!;
    const answer = room.peekAnswerForTests()!;
    const wrong = room.theme.characters.find((c) => c.id !== answer.id)!;

    const miss: GuessResult = unwrap(
      await bia.emitWithAck("guess:submit", { characterId: wrong.id }),
    );
    expect(miss.correct).toBe(false);

    const finished = nextState(ana, (s) => s.phase === "finished");
    unwrap(await ana.emitWithAck("guess:submit", { characterId: answer.id }));
    unwrap(await bia.emitWithAck("guess:submit", { characterId: answer.id }));
    const final = await finished;

    expect(final.standings?.[0]?.nickname).toBe("Ana");
    expect(final.lastRound?.character.id).toBe(answer.id);

    // Bia "recarrega a página": nova conexão com o token volta como o mesmo jogador.
    bia.disconnect();
    const biaAgain = await client();
    const rejoined = unwrap(
      await biaAgain.emitWithAck("room:join", {
        code: created.code,
        nickname: "Bia",
        avatar: "🐆",
        token: joined.token,
      }),
    );
    expect(rejoined.playerId).toBe(joined.playerId);
  });

  it("modo Imagem: cada um recebe só a imagem do seu nível, e a resposta não vaza", async () => {
    const ana = await client();
    const bia = await client();
    const created = unwrap(
      await ana.emitWithAck("room:create", {
        nickname: "Ana",
        avatar: "🦜",
        settings: { rounds: 1, roundSeconds: 60, themeSlug: "fauna-brasileira", mode: "image" },
      }),
    );
    const biaOptions = new Promise<unknown[]>((resolve) => bia.once("room:characters", resolve));
    unwrap(
      await bia.emitWithAck("room:join", { code: created.code, nickname: "Bia", avatar: "🐆" }),
    );
    // O autocompletar chega pelo servidor, sem imagem e sem emoji.
    const options = await biaOptions;
    expect(options.length).toBeGreaterThan(0);
    expect(JSON.stringify(options)).not.toMatch(/\/temas\/|"emoji"|"image"/);

    // Tudo que a Bia recebe até o fim da rodada (menos os bytes das imagens).
    const biaEvents: string[] = [];
    const biaImages: RoundImage[] = [];
    const anaImages: RoundImage[] = [];
    bia.onAny((event: string, ...args: unknown[]) => {
      if (event === "round:image") biaImages.push(args[0] as RoundImage);
      else if (event !== "round:end" && event !== "game:end") biaEvents.push(JSON.stringify(args));
    });
    ana.on("round:image", (image) => anaImages.push(image));

    const biaReady = new Promise<void>((resolve) => {
      bia.on("you:state", (state: PrivateState) => state.image?.status === "ready" && resolve());
    });
    const started = nextState(bia, (s) => s.phase === "round");
    unwrap(await ana.emitWithAck("game:start"));
    expect((await started).settings.mode).toBe("image");
    await biaReady;

    const room = server.manager.get(created.code)!;
    const answer = room.peekAnswerForTests()!;
    const wrong = room.theme.characters.find((c) => c.id !== answer.id)!;

    const anaLevel1 = new Promise<void>((resolve) => {
      ana.on("round:image", (image) => image.level === 1 && resolve());
    });
    const miss = unwrap(await ana.emitWithAck("guess:submit", { characterId: wrong.id }));
    expect(miss.feedback).toEqual([]);
    await anaLevel1;

    // A Bia não chutou: continua só com o nível 0, e não recebeu o nível da Ana.
    expect(biaImages.map((image) => image.level)).toEqual([0]);
    expect(anaImages.map((image) => image.level)).toEqual([0, 1]);
    expect(
      Buffer.from(biaImages[0]!.data as ArrayBuffer)
        .subarray(8, 12)
        .toString(),
    ).toBe("WEBP");

    for (const text of biaEvents) {
      expect(text).not.toContain(`"${answer.id}"`);
      expect(text).not.toContain(answer.image!);
    }

    // Na revelação, a imagem nítida (o caminho público) aparece.
    const finished = nextState(ana, (s) => s.phase === "finished");
    unwrap(await ana.emitWithAck("guess:submit", { characterId: answer.id }));
    unwrap(await bia.emitWithAck("guess:submit", { characterId: answer.id }));
    expect((await finished).lastRound?.character.image).toBe(answer.image);
  });

  it("prévia do link: só dados públicos da sala, 404 sem sala e limite por IP", async () => {
    const ana = await client();
    const created = unwrap(
      await ana.emitWithAck("room:create", {
        nickname: "Lucas",
        avatar: "⚽",
        settings: { rounds: 1, roundSeconds: 60, themeSlug: "futebol-atual", maxPlayers: 8 },
      }),
    );
    // Usa um IP próprio para não dividir o limite com os outros testes.
    const headers = { "x-forwarded-for": "203.0.113.7" };
    const response = await fetch(`${url}/rooms/${created.code.toLowerCase()}/preview`, { headers });
    expect(response.status).toBe(200);
    const preview = await response.json();
    expect(preview).toEqual({
      code: created.code,
      host: { nickname: "Lucas", avatar: "⚽" },
      theme: { name: "Futebol brasileiro atual", emoji: expect.any(String) },
      players: 1,
      maxPlayers: 8,
      phase: "lobby",
    });
    // Nada de token, ids de jogador ou da rodada.
    expect(JSON.stringify(preview)).not.toMatch(/token|playerId|character|answer/i);

    // Durante a partida, a prévia continua sem nada da rodada.
    const started = nextState(ana, (s) => s.phase === "round");
    unwrap(await ana.emitWithAck("game:start"));
    await started;
    const answer = server.manager.get(created.code)!.peekAnswerForTests()!;
    const during = await fetch(`${url}/rooms/${created.code}/preview`, { headers }).then((r) =>
      r.text(),
    );
    expect(during).not.toContain(answer.id);
    expect(during).not.toContain(answer.name);

    expect((await fetch(`${url}/rooms/ZZZZZZ/preview`, { headers })).status).toBe(404);
    expect((await fetch(`${url}/rooms/%E0%A4%A/preview`, { headers })).status).toBe(404);

    const flood = { "x-forwarded-for": "203.0.113.99" };
    const statuses = await Promise.all(
      Array.from({ length: 40 }, () =>
        fetch(`${url}/rooms/ZZZZZZ/preview`, { headers: flood }).then((r) => r.status),
      ),
    );
    expect(statuses).toContain(429);
  });

  it("recusa dados inválidos com mensagem em português", async () => {
    const socket = await client();
    const badNick = await socket.emitWithAck("room:create", { nickname: "A", avatar: "🦜" });
    expect(badNick).toMatchObject({ ok: false });
    if (!badNick.ok) expect(badNick.error).toContain("apelido");

    const missing = await socket.emitWithAck("room:join", {
      code: "ZZZZZZ",
      nickname: "Caio",
      avatar: "🐊",
    });
    expect(missing).toEqual({ ok: false, error: "Sala não encontrada. Confira o código." });

    const noRoom = await socket.emitWithAck("guess:submit", { characterId: "capivara" });
    expect(noRoom).toMatchObject({ ok: false });
  });
});

describe("utilidades", () => {
  it("filtro de palavrões não bloqueia palavras inocentes", () => {
    expect(containsProfanity("Computador")).toBe(false);
    expect(containsProfanity("Lucas")).toBe(false);
    expect(containsProfanity("P0rra")).toBe(true);
  });

  it("balde de fichas limita rajadas", () => {
    let now = 0;
    const bucket = new TokenBucket(2, 1, () => now);
    expect([bucket.take(), bucket.take(), bucket.take()]).toEqual([true, true, false]);
    now = 1000;
    expect(bucket.take()).toBe(true);
  });
});
