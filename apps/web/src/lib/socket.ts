"use client";

import { io, type Socket } from "socket.io-client";
import type { Ack, ClientToServerEvents, ServerToClientEvents } from "@chutai/shared";

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL ?? "http://localhost:3001";

let socket: GameSocket | undefined;

/**
 * Uma conexão só por aba, compartilhada entre as páginas.
 * Assim, criar a sala na página inicial e ir para /sala/CODIGO não reconecta.
 */
export function getSocket(): GameSocket {
  socket ??= io(REALTIME_URL, {
    autoConnect: false,
    transports: ["websocket", "polling"],
    reconnectionDelay: 500,
    reconnectionDelayMax: 4000,
  });
  if (!socket.connected && !socket.active) socket.connect();
  return socket;
}

/** Espera a conexão abrir (ou falha depois de alguns segundos). */
export function waitForConnection(s: GameSocket, timeoutMs = 6000): Promise<void> {
  if (s.connected) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Não deu para conectar ao servidor do jogo. Ele está rodando?"));
    }, timeoutMs);
    const onConnect = () => {
      cleanup();
      resolve();
    };
    const cleanup = () => {
      clearTimeout(timer);
      s.off("connect", onConnect);
    };
    s.on("connect", onConnect);
  });
}

/** Transforma a resposta do servidor em valor ou erro, para usar com try/catch. */
export function unwrap<T>(response: Ack<T>): T {
  if (!response.ok) throw new Error(response.error);
  return response.data;
}
