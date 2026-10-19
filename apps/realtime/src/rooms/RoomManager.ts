/**
 * Cria, encontra e apaga salas. Também cuida da limpeza de salas abandonadas
 * e de salvar/restaurar retratos no store (memória ou Redis).
 */
import {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  type RoomSettings,
  type Theme,
} from "@chutai/shared";
import { randomCode } from "@chutai/game";
import { Room, type RoomEmitter } from "./Room";
import type { RoomSnapshot, RoomStore } from "./store";
import type { MatchService } from "../services/matchService";
import type { ThemeService } from "../services/themeService";
import { logger } from "../lib/logger";

export interface RoomManagerDeps {
  store: RoomStore;
  matches: MatchService;
  themes: ThemeService;
  /** Como cada sala fala com os jogadores (Socket.IO no servidor real). */
  emitterFor: (code: string) => RoomEmitter;
  disconnectGraceMs: number;
  emptyRoomTtlMs: number;
  intermissionMs?: number;
  now?: () => number;
}

export class RoomManager {
  private readonly rooms = new Map<string, Room>();
  private readonly emptySince = new Map<string, number>();
  private sweepTimer?: NodeJS.Timeout;
  private readonly now: () => number;

  constructor(private readonly deps: RoomManagerDeps) {
    this.now = deps.now ?? Date.now;
  }

  get size(): number {
    return this.rooms.size;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  create(theme: Theme, settings: RoomSettings): Room {
    let code = randomCode(ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH);
    while (this.rooms.has(code)) code = randomCode(ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH);
    const room = this.build(code, theme, settings);
    this.rooms.set(code, room);
    logger.info(`Sala ${code} criada (tema: ${theme.slug}).`);
    return room;
  }

  private build(code: string, theme: Theme, settings: RoomSettings): Room {
    return new Room(code, theme, settings, {
      emitter: this.deps.emitterFor(code),
      disconnectGraceMs: this.deps.disconnectGraceMs,
      intermissionMs: this.deps.intermissionMs,
      now: this.now,
      onFinished: (record) => void this.deps.matches.save(record),
      onChange: (room) => this.persist(room),
    });
  }

  delete(code: string): void {
    const room = this.rooms.get(code);
    if (!room) return;
    room.dispose();
    this.rooms.delete(code);
    this.emptySince.delete(code);
    void this.deps.store
      .delete(code)
      .catch((error) => logger.warn("Falha ao apagar retrato", error));
    logger.info(`Sala ${code} encerrada.`);
  }

  /** Apaga salas sem ninguém conectado há mais de `emptyRoomTtlMs`. */
  sweep(): void {
    const now = this.now();
    for (const [code, room] of this.rooms) {
      if (room.connectedPlayers.length > 0) {
        this.emptySince.delete(code);
        continue;
      }
      const since = this.emptySince.get(code) ?? now;
      this.emptySince.set(code, since);
      if (room.players.size === 0 || now - since >= this.deps.emptyRoomTtlMs) this.delete(code);
    }
  }

  startSweeping(intervalMs = 60_000): void {
    this.sweepTimer = setInterval(() => this.sweep(), intervalMs);
    this.sweepTimer.unref();
  }

  private persist(room: Room): void {
    void this.deps.store.save(this.snapshot(room)).catch((error) => {
      logger.warn(`Falha ao salvar retrato da sala ${room.code}`, error);
    });
  }

  snapshot(room: Room): RoomSnapshot {
    return {
      code: room.code,
      themeSlug: room.theme.slug,
      settings: room.settings,
      hostId: room.hostId,
      createdAt: room.createdAt,
      players: [...room.players.values()].map((player) => ({
        id: player.id,
        nickname: player.nickname,
        avatar: player.avatar,
        token: player.token,
        joinedAt: player.joinedAt,
      })),
    };
  }

  /** Recria as salas salvas no store (útil com Redis, depois de um reinício). */
  async restore(): Promise<number> {
    const snapshots = await this.deps.store.loadAll();
    let restored = 0;
    for (const snapshot of snapshots) {
      if (this.rooms.has(snapshot.code) || snapshot.players.length === 0) continue;
      const theme = await this.deps.themes.get(snapshot.themeSlug);
      if (!theme) continue;
      const room = this.build(snapshot.code, theme, snapshot.settings);
      for (const saved of snapshot.players) {
        room.players.set(saved.id, { ...saved, score: 0, connected: false });
      }
      room.hostId = snapshot.hostId;
      this.rooms.set(snapshot.code, room);
      this.emptySince.set(snapshot.code, this.now());
      restored += 1;
    }
    if (restored) logger.info(`${restored} sala(s) restaurada(s) do ${this.deps.store.kind}.`);
    return restored;
  }

  async close(): Promise<void> {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    for (const room of this.rooms.values()) room.dispose();
    this.rooms.clear();
    await this.deps.store.close();
  }
}
