import "server-only";
import { cache } from "react";
import type { RoomPreview, RoomResult } from "@chutai/shared";
import { REALTIME_URL } from "./site";

/**
 * Dados públicos de uma sala, direto do servidor de tempo real (rota só de leitura).
 * Sala inexistente, servidor fora do ar ou lento (mais de 2 s): null, e a prévia vira o
 * cartão genérico. Nunca derruba a página.
 */
export const fetchRoomPreview = cache(async (code: string): Promise<RoomPreview | null> => {
  try {
    const response = await fetch(`${REALTIME_URL}/rooms/${encodeURIComponent(code)}/preview`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) return null;
    return (await response.json()) as RoomPreview;
  } catch {
    return null;
  }
});

/** "3 de 8 jogadores na sala" ou, com a partida andando, "Partida em andamento com 3 jogadores". */
export function previewPlayersText(preview: RoomPreview): string {
  const count = `${preview.players} ${preview.players === 1 ? "jogador" : "jogadores"}`;
  if (preview.phase === "lobby")
    return `${preview.players} de ${preview.maxPlayers} jogadores na sala.`;
  if (preview.phase === "finished") return `Partida encerrada com ${count}.`;
  return `Partida em andamento com ${count}.`;
}

/** Pódio da partida que acabou de terminar (só existe enquanto a sala está no pódio). */
export async function fetchRoomResult(code: string): Promise<RoomResult | null> {
  try {
    const response = await fetch(`${REALTIME_URL}/rooms/${encodeURIComponent(code)}/result`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) return null;
    return (await response.json()) as RoomResult;
  } catch {
    return null;
  }
}
