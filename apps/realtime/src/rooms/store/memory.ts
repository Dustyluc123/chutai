import type { RoomSnapshot, RoomStore } from "./types";

interface Expiring<T> {
  value: T;
  expiresAt: number;
}

/**
 * Padrão sem REDIS_URL (desenvolvimento local e testes). As salas já vivem na memória do
 * RoomManager; este store imita o Redis (posse com validade, retrato em JSON) para os testes
 * conseguirem simular dois servidores dividindo o mesmo store. Se o processo reiniciar, some tudo.
 */
export class MemoryRoomStore implements RoomStore {
  readonly kind = "memory" as const;
  private readonly snapshots = new Map<string, Expiring<string>>();
  private readonly leases = new Map<string, Expiring<string>>();

  constructor(private readonly now: () => number = Date.now) {}

  private alive<T>(map: Map<string, Expiring<T>>, key: string): T | undefined {
    const item = map.get(key);
    if (!item) return undefined;
    if (item.expiresAt <= this.now()) {
      map.delete(key);
      return undefined;
    }
    return item.value;
  }

  async acquire(code: string, owner: string, ttlMs: number): Promise<boolean> {
    const current = this.alive(this.leases, code);
    if (current !== undefined && current !== owner) return false;
    this.leases.set(code, { value: owner, expiresAt: this.now() + ttlMs });
    return true;
  }

  async renew(
    codes: string[],
    owner: string,
    ttlMs: number,
    snapshotTtlMs: number,
  ): Promise<string[]> {
    const lost: string[] = [];
    for (const code of codes) {
      if (this.alive(this.leases, code) !== owner) {
        lost.push(code);
        continue;
      }
      this.leases.set(code, { value: owner, expiresAt: this.now() + ttlMs });
      const snapshot = this.snapshots.get(code);
      if (snapshot) snapshot.expiresAt = this.now() + snapshotTtlMs;
    }
    return lost;
  }

  async release(code: string, owner: string): Promise<void> {
    if (this.alive(this.leases, code) === owner) this.leases.delete(code);
  }

  async save(snapshot: RoomSnapshot, owner: string, snapshotTtlMs: number): Promise<boolean> {
    if (this.alive(this.leases, snapshot.code) !== owner) return false;
    this.snapshots.set(snapshot.code, {
      value: JSON.stringify(snapshot),
      expiresAt: this.now() + snapshotTtlMs,
    });
    return true;
  }

  async load(code: string): Promise<RoomSnapshot | undefined> {
    const raw = this.alive(this.snapshots, code);
    return raw ? (JSON.parse(raw) as RoomSnapshot) : undefined;
  }

  async exists(code: string): Promise<boolean> {
    return (
      this.alive(this.snapshots, code) !== undefined || this.alive(this.leases, code) !== undefined
    );
  }

  async delete(code: string, owner: string): Promise<void> {
    const current = this.alive(this.leases, code);
    if (current !== undefined && current !== owner) return;
    this.leases.delete(code);
    this.snapshots.delete(code);
  }

  async close(): Promise<void> {
    // Nada a fechar: os testes podem reaproveitar o mesmo store em outro "servidor".
  }
}
