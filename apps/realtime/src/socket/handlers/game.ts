import { identify } from "../middleware/identify";
import type { HandlerContext, IoSocket } from "../types";
import { withoutPayload } from "./safe";

export function registerGameHandlers(socket: IoSocket, ctx: HandlerContext) {
  socket.on(
    "game:start",
    withoutPayload(() => {
      const { room, playerId } = identify(socket, ctx.manager);
      room.start(playerId);
      return null;
    }),
  );

  socket.on(
    "game:restart",
    withoutPayload(() => {
      const { room, playerId } = identify(socket, ctx.manager);
      room.restart(playerId);
      return null;
    }),
  );
}
