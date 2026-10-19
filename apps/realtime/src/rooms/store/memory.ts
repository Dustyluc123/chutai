import type { RoomSnapshot, RoomStore } from "./types";

/**
 * Usado hoje. As salas já vivem na memória do RoomManager; este store só guarda
 * os retratos para manter a mesma interface do Redis (e facilitar testes).
 * Se o servidor reiniciar, as salas somem — aceitável no MVP com um servidor só.
 */
export class MemoryRoomStore implements RoomStore {
  readonly kind = "memory" as const;
  private readonly snapshots = new Map<string, RoomSnapshot>();

  async save(snapshot: RoomSnapshot): Promise<void> {
    this.snapshots.set(snapshot.code, snapshot);
  }

  async delete(code: string): Promise<void> {
    this.snapshots.delete(code);
  }

  async loadAll(): Promise<RoomSnapshot[]> {
    return [...this.snapshots.values()];
  }

  async close(): Promise<void> {
    this.snapshots.clear();
  }
}
