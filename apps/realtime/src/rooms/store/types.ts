import type { RoomSettings } from "@chutai/shared";

/**
 * Retrato de uma sala que dá para salvar fora da memória.
 * Rodadas em andamento não entram (cronômetros não sobrevivem a um reinício):
 * ao restaurar, a sala volta para o lobby com os mesmos jogadores, que reconectam pelo token.
 */
export interface RoomSnapshot {
  code: string;
  themeSlug: string;
  settings: RoomSettings;
  hostId: string;
  createdAt: number;
  players: { id: string; nickname: string; avatar: string; token: string; joinedAt: number }[];
}

export interface RoomStore {
  readonly kind: "memory" | "redis";
  save(snapshot: RoomSnapshot): Promise<void>;
  delete(code: string): Promise<void>;
  loadAll(): Promise<RoomSnapshot[]>;
  close(): Promise<void>;
}
