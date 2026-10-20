/**
 * Monta o servidor completo: HTTP (saúde e lista de temas) + Socket.IO + salas.
 * Separado do index.ts para os testes subirem um servidor de verdade numa porta livre.
 */
import { existsSync } from "node:fs";
import { createServer, type Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { createRepositories } from "@chutai/db";
import type { Config } from "./config";
import { RoomManager } from "./rooms/RoomManager";
import { createRoomStore } from "./rooms/store";
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
  close(): Promise<void>;
}

export async function createRealtimeServer(
  config: Config,
  options: {
    intermissionMs?: number;
    countdownMs?: number;
    /** Troca o jeito de buscar as imagens originais (os testes leem do disco). */
    imageLoader?: ImageLoader;
  } = {},
): Promise<RealtimeServer> {
  const repositories = await createRepositories(config.databaseUrl);
  const store = await createRoomStore(config.redisUrl);
  const themes = new ThemeService(repositories.themes);
  const matches = new MatchService(repositories.matches);
  const roundImages = new RoundImageService(
    options.imageLoader ?? diskImageLoader(config.assetsDir, httpImageLoader(config.assetsBaseUrl)),
  );
  const assetsOnDisk = existsSync(config.assetsDir);

  const startedAt = Date.now();
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
  });
  ref.manager = manager;
  await manager.restore();
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
  };
}
