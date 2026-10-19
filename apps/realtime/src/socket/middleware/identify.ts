import { GameError } from "../../lib/errors";
import type { Room } from "../../rooms/Room";
import type { RoomManager } from "../../rooms/RoomManager";
import type { IoSocket } from "../types";

/**
 * Descobre quem é o jogador desta conexão e em que sala ele está.
 * O id vem de `socket.data`, preenchido pelo próprio servidor ao entrar na sala —
 * o navegador nunca diz "eu sou o jogador X".
 */
export function identify(socket: IoSocket, manager: RoomManager): { room: Room; playerId: string } {
  const { roomCode, playerId } = socket.data;
  if (!roomCode || !playerId) throw new GameError("Entre em uma sala primeiro.");
  const room = manager.get(roomCode);
  if (!room || !room.players.has(playerId)) {
    socket.data.roomCode = undefined;
    socket.data.playerId = undefined;
    throw new GameError("Essa sala não existe mais.");
  }
  return { room, playerId };
}
