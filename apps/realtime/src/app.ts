/**
 * Monta o servidor completo: HTTP (saúde e lista de temas) + Socket.IO + salas.
 * Separado do index.ts para os testes subirem um servidor de verdade numa porta livre.
 */
import { existsSync } from "node:fs";
import { createServer, type Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { createRepositories } from "@chutai/db";
import { roomCodeSchema } from "@chutai/shared";
import { HttpRateLimiter } from "./lib/httpRateLimit";
import type { Config } from "./config";
import { RoomManager } from "./rooms/RoomManager";
import { createRoomStore, type RoomStore } from "./rooms/store";
import { MatchService } from "./services/matchService";
import {
  RoundImageService,
  diskImageLoader,
  httpImageLoader,
  type ImageLoader,
} from "./services/roundImageService";
import { ThemeService } from "./services/themeService";
import { registerSocketHandlers } from "./socket";
import { playerChannel, roomChannel, type IoServer } from "./socket/types";
import type { RoomEmitter } from "./rooms/Room";

export interface RealtimeServer {
  httpServer: HttpServer;
  io: IoServer;
  manager: RoomManager;
  mode: { data: "json" | "postgres"; rooms: "memory" | "redis" };
  listen(port?: number): Promise<number>;
  /** Fecha tudo sem salvar (testes). */
  close(): Promise<void>;
  /**
   * Desligamento de verdade (SIGTERM): para os cronômetros, grava as salas no store, solta a
   * posse e fecha as conexões. Os navegadores reconectam no servidor novo.
   */
  shutdown(): Promise<number>;
}

export async function createRealtimeServer(
  config: Config,
  options: {
    intermissionMs?: number;
    countdownMs?: number;
    /** Troca o jeito de buscar as imagens originais (os testes leem do disco). */
    imageLoader?: ImageLoader;
    /** Store das salas já pronto (os testes simulam dois servidores dividindo o mesmo). */
    store?: RoomStore;
    instanceId?: string;
  } = {},
): Promise<RealtimeServer> {
  const repositories = await createRepositories(config.databaseUrl);
  const store = options.store ?? (await createRoomStore(config.redisUrl));
  const themes = new ThemeService(repositories.themes);
  const matches = new MatchService(repositories.matches);
  const roundImages = new RoundImageService(
    options.imageLoader ?? diskImageLoader(config.assetsDir, httpImageLoader(config.assetsBaseUrl)),
  );
  const assetsOnDisk = existsSync(config.assetsDir);

  const startedAt = Date.now();
  // Prévia do link e pódio: quem gera as imagens é o site (servidor da Vercel) quando alguém cola o link num app.
  // Um limite folgado por IP basta para impedir varredura de códigos.
  const previewLimiter = new HttpRateLimiter(30, 1);
  // O gerenciador depende do Socket.IO, que depende do servidor HTTP: guardamos a referência aqui.
  const ref: { manager?: RoomManager } = {};

  const httpServer = createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (origin && config.corsOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    if (req.url === "/health") {
      res.end(
        JSON.stringify({
          ok: true,
          rooms: ref.manager?.size ?? 0,
          uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
          data: repositories.mode,
          roomStore: store.kind,
          images: assetsOnDisk ? "disco" : "http",
        }),
      );
      return;
    }
    if (req.url === "/themes") {
      res.end(JSON.stringify(await themes.list()));
      return;
    }
    const roomRoute = /^\/rooms\/([^/?#]+)\/(preview|result)(?:\?.*)?$/.exec(req.url ?? "");
    if (roomRoute && req.method === "GET") {
      res.setHeader("Cache-Control", "no-store");
      if (!previewLimiter.allow(req)) {
        res.statusCode = 429;
        res.end(JSON.stringify({ ok: false, error: "Muitas requisições. Tente de novo já já." }));
        return;
      }
      // O código só tem letras e números: nada para decodificar (e nada de exceção com % solto).
      const code = roomCodeSchema.safeParse(roomRoute[1]);
      // Depois de um reinício a sala pode estar só no Redis: carrega sem esperar a posse.
      const room = code.success
        ? await ref.manager?.load(code.data, { wait: false }).catch(() => undefined)
        : undefined;
      // Prévia: dados públicos da sala. Resultado: o pódio, só enquanto a sala está nele.
      const body = roomRoute[2] === "preview" ? room?.toPreview() : room?.toResult();
      if (!body) {
        res.statusCode = 404;
        res.end(JSON.stringify({ ok: false, error: "Sala não encontrada." }));
        return;
      }
      res.end(JSON.stringify(body));
      return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ ok: false, error: "Rota não encontrada." }));
  });

  const io: IoServer = new Server(httpServer, {
    cors: { origin: config.corsOrigins, credentials: true },
    // Socket.IO tenta reconectar sozinho; este tempo deixa recuperar eventos perdidos em quedas curtas.
    connectionStateRecovery: { maxDisconnectionDuration: 60_000 },
  });

  const emitterFor = (code: string): RoomEmitter => ({
    broadcast: (event, ...args) => io.to(roomChannel(code)).emit(event, ...args),
    toPlayer: (playerId, event, ...args) => io.to(playerChannel(playerId)).emit(event, ...args),
  });

  const manager = new RoomManager({
    store,
    matches,
    themes,
    roundImages,
    emitterFor,
    disconnectGraceMs: config.disconnectGraceMs,
    emptyRoomTtlMs: config.emptyRoomTtlMs,
    intermissionMs: options.intermissionMs,
    countdownMs: options.countdownMs,
    instanceId: options.instanceId ?? config.instanceId,
    // Outro servidor assumiu a sala: derruba as conexões dela aqui para elas irem para lá.
    onEvicted: (code) => io.in(roomChannel(code)).disconnectSockets(true),
  });
  ref.manager = manager;
  manager.startSweeping();

  registerSocketHandlers({ io, manager, themes });

  return {
    httpServer,
    io,
    manager,
    mode: { data: repositories.mode, rooms: store.kind },
    listen(port = config.port) {
      return new Promise((resolve) => {
        httpServer.listen(port, () => {
          const address = httpServer.address();
          resolve(typeof address === "object" && address ? address.port : port);
        });
      });
    },
    async close() {
      await manager.close();
      await new Promise<void>((resolve) => io.close(() => resolve()));
    },
    async shutdown() {
      const saved = await manager.shutdown();
      // Fecha as conexões: os navegadores tentam de novo sozinhos e caem no servidor novo.
      await new Promise<void>((resolve) => io.close(() => resolve()));
      await store.close().catch(() => undefined);
      return saved;
    },
  };
}
