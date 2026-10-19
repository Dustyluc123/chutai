import { logger } from "../lib/logger";
import { applyRateLimit } from "./middleware/rateLimit";
import { registerGameHandlers } from "./handlers/game";
import { registerGuessHandlers } from "./handlers/guess";
import { registerRoomHandlers } from "./handlers/room";
import type { HandlerContext } from "./types";

/** Registra todos os eventos para cada nova conexão. */
export function registerSocketHandlers(ctx: HandlerContext) {
  ctx.io.on("connection", (socket) => {
    applyRateLimit(socket);
    registerRoomHandlers(socket, ctx);
    registerGameHandlers(socket, ctx);
    registerGuessHandlers(socket, ctx);
    socket.on("error", (error) => logger.warn(`Erro na conexão ${socket.id}`, error));
  });
}
