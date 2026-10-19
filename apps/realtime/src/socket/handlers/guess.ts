import { requestHintSchema, submitGuessSchema } from "@chutai/shared";
import { identify } from "../middleware/identify";
import type { HandlerContext, IoSocket } from "../types";
import { withValidation } from "./safe";

export function registerGuessHandlers(socket: IoSocket, ctx: HandlerContext) {
  socket.on(
    "guess:submit",
    withValidation(submitGuessSchema, ({ characterId }) => {
      const { room, playerId } = identify(socket, ctx.manager);
      const result = room.guess(playerId, characterId);
      // Mantém outras abas do mesmo jogador em sincronia.
      room.sendPrivate(playerId);
      return result;
    }),
  );

  socket.on(
    "hint:request",
    withValidation(requestHintSchema, ({ type }) => {
      const { room, playerId } = identify(socket, ctx.manager);
      const hint = room.hint(playerId, type);
      room.sendPrivate(playerId);
      return hint;
    }),
  );
}
