import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@chutai/shared";
import type { RoomManager } from "../rooms/RoomManager";
import type { ThemeService } from "../services/themeService";

export type IoServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
export type IoSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export interface HandlerContext {
  io: IoServer;
  manager: RoomManager;
  themes: ThemeService;
}

/** Canal do Socket.IO com todos da sala. */
export const roomChannel = (code: string) => `room:${code}`;
/** Canal pessoal de um jogador (todas as abas dele recebem). */
export const playerChannel = (playerId: string) => `player:${playerId}`;
