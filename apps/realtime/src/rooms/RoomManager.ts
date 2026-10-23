/**
 * Cria, encontra e apaga salas. Também cuida da limpeza de salas abandonadas e de salvar e
 * carregar retratos no store (memória ou Redis).
 *
 * Deploy sem derrubar partidas (com Redis):
 * 1. Cada sala tem um dono no Redis (a "posse", que vence em POSSE_MS se não for renovada).
 *    Só o dono roda os cronômetros e grava o retrato.
 * 2. Servidor novo não pega salas ao ligar: carrega uma sala só quando alguém tenta entrar nela,
 *    e só se conseguir a posse. Enquanto o antigo ainda é o dono, o pedido espera.
 * 3. No SIGTERM, o antigo para os cronômetros, grava tudo, solta as posses e fecha as conexões.
 *    Os navegadores reconectam no novo com o token e a sala continua de onde parou.
 * 4. Se o antigo cair sem avisar, a posse vence sozinha e o novo assume.
 */
import { randomUUID } from "node:crypto";
import {
  DEFAULT_SETTINGS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  type RoomSettings,
  type Theme,
} from "@chutai/shared";
import { ROOM_LIFECYCLE, randomCode } from "@chutai/game";
import { Room, type RoomEmitter } from "./Room";
import type { RoomSnapshot, RoomStore } from "./store";
import type { MatchService } from "../services/matchService";
import type { ThemeService } from "../services/themeService";
import type { RoundImageService } from "../services/roundImageService";
import { GameError } from "../lib/errors";
import { logger } from "../lib/logger";

/** Validade da posse de uma sala. O dono renova a cada RENEW_MS. */
export const LEASE_MS = 15_000;
const RENEW_MS = 5_000;
/** Mudanças seguidas (vários chutes no mesmo instante) viram um salvamento só. */
const SAVE_DEBOUNCE_MS = 300;
/** Quanto um pedido de entrada espera a posse ser liberada (um pouco mais que a validade). */
const ACQUIRE_WAIT_MS = LEASE_MS + 2_000;
const ACQUIRE_RETRY_MS = 400;

export interface RoomManagerDeps {
  store: RoomStore;
  matches: MatchService;
  themes: ThemeService;
  /** Gera as imagens degradadas do modo Imagem. */
  roundImages?: RoundImageService;
  /** Como cada sala fala com os jogadores (Socket.IO no servidor real). */
  emitterFor: (code: string) => RoomEmitter;
  disconnectGraceMs: number;
  emptyRoomTtlMs: number;
  intermissionMs?: number;
  countdownMs?: number;
  now?: () => number;
  /** Id deste servidor (dono das salas). Padrão: aleatório a cada inicialização. */
  instanceId?: string;
  /** Chamado quando outro servidor assumiu uma sala que estava aqui (derruba as conexões dela). */
  onEvicted?: (code: string) => void;
  /** Espera entre tentativas de pegar a posse (os testes usam um valor pequeno). */
  acquireRetryMs?: number;
  acquireWaitMs?: number;
}

export class RoomManager {
  readonly instanceId: string;
  private readonly rooms = new Map<string, Room>();
  private readonly emptySince = new Map<string, number>();
  private readonly loading = new Map<string, Promise<Room | undefined>>();
  private readonly pendingSaves = new Map<string, NodeJS.Timeout>();
  private readonly savesInFlight = new Set<Promise<unknown>>();
  private sweepTimer?: NodeJS.Timeout;
  private renewTimer?: NodeJS.Timeout;
  private shuttingDown = false;
  private readonly now: () => number;

  constructor(private readonly deps: RoomManagerDeps) {
    this.now = deps.now ?? Date.now;
    this.instanceId = deps.instanceId ?? randomUUID();
  }

  get size(): number {
    return this.rooms.size;
  }

  /** Salas que já estão neste servidor. */
  get(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  /** Validade do retrato no store: sala esquecida (ninguém renovando) some sozinha. */
  private get snapshotTtlMs(): number {
    return Math.max(this.deps.emptyRoomTtlMs, 60_000);
  }

  async create(theme: Theme, settings: RoomSettings): Promise<Room> {
    if (this.shuttingDown) throw new GameError("O servidor está reiniciando. Tente de novo já já.");
    for (let attempt = 0; ; attempt++) {
      const code = randomCode(ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH);
      if (this.rooms.has(code) || this.loading.has(code)) continue;
      // Com Redis, o código pode estar em uso noutro servidor (ou num retrato esperando a volta).
      if (await this.deps.store.exists(code)) continue;
      if (!(await this.deps.store.acquire(code, this.instanceId, LEASE_MS))) continue;
      if (this.rooms.has(code)) continue;
      const room = this.build(code, theme, settings);
      this.rooms.set(code, room);
      logger.info(`Sala ${code} criada (tema: ${theme.slug}).`);
      return room;
    }
  }

  /**
   * Encontra a sala: neste servidor ou, se não estiver aqui, no store (depois de um reinício).
   * Espera a posse se outro servidor ainda for o dono (deploy em andamento).
   */
  async load(code: string, { wait = true }: { wait?: boolean } = {}): Promise<Room | undefined> {
    const key = code.toUpperCase();
    const here = this.rooms.get(key);
    if (here) return here;
    if (this.shuttingDown) return undefined;
    const pending = this.loading.get(key);
    if (pending) return pending;
    const job = this.loadFromStore(key, wait).finally(() => this.loading.delete(key));
    this.loading.set(key, job);
    return job;
  }

  private async loadFromStore(code: string, wait: boolean): Promise<Room | undefined> {
    const snapshot = await this.deps.store.load(code);
    if (!snapshot || snapshot.players.length === 0) return undefined;
    const theme = await this.deps.themes.get(snapshot.themeSlug);
    if (!theme) return undefined;

    const deadline = this.now() + (wait ? (this.deps.acquireWaitMs ?? ACQUIRE_WAIT_MS) : 0);
    while (!(await this.deps.store.acquire(code, this.instanceId, LEASE_MS))) {
      if (this.now() >= deadline || this.shuttingDown) {
        if (wait) throw new GameError("A sala está mudando de servidor. Tente de novo já já.");
        return undefined;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, this.deps.acquireRetryMs ?? ACQUIRE_RETRY_MS),
      );
    }
    // Pegou a posse: lê de novo, porque o dono anterior pode ter gravado antes de soltar.
    const latest = (await this.deps.store.load(code)) ?? snapshot;
    const room = this.build(code, theme, { ...DEFAULT_SETTINGS, ...latest.settings });
    this.rooms.set(code, room);
    this.emptySince.set(code, this.now());
    try {
      room.restoreFrom(latest);
    } catch (error) {
      // Retrato que passou na conferência mas não deu para restaurar: descarta a sala em vez de
      // derrubar o servidor (o jogador vê "Sala não encontrada").
      logger.warn(`Sala ${code}: retrato inválido, descartado.`, error);
      room.dispose();
      this.rooms.delete(code);
      this.emptySince.delete(code);
      await this.deps.store.delete(code, this.instanceId).catch(() => undefined);
      return undefined;
    }
    logger.info(
      `Sala ${code} carregada do ${this.deps.store.kind} (fase: ${room.phase}, salva há ${
        latest.savedAt ? Math.round((this.now() - latest.savedAt) / 1000) : "?"
      } s).`,
    );
    return room;
  }

  private build(code: string, theme: Theme, settings: RoomSettings): Room {
    return new Room(code, theme, settings, {
      emitter: this.deps.emitterFor(code),
      disconnectGraceMs: this.deps.disconnectGraceMs,
      intermissionMs: this.deps.intermissionMs,
      countdownMs: this.deps.countdownMs,
      now: this.now,
      onFinished: (record) => void this.deps.matches.save(record),
      onChange: (room) => this.persistSoon(room),
      renderRoundImages: this.deps.roundImages
        ? (character, seed) => this.deps.roundImages!.render(character, seed)
        : undefined,
      onImageError: (error, character) =>
        logger.error(`Sala ${code}: não deu para gerar a imagem de ${character.id}`, error),
      onAbandoned: () => {
        logger.info(
          `Sala ${code} encerrada por abandono (ninguém conectado por ${ROOM_LIFECYCLE.abandonedSeconds} s no meio da partida).`,
        );
        this.delete(code);
      },
    });
  }

  delete(code: string): void {
    const room = this.rooms.get(code);
    if (!room) return;
    room.dispose();
    this.rooms.delete(code);
    this.emptySince.delete(code);
    this.cancelPendingSave(code);
    this.track(
      this.deps.store
        .delete(code, this.instanceId)
        .catch((error) => logger.warn("Falha ao apagar retrato", error)),
    );
    logger.info(`Sala ${code} encerrada.`);
  }

  /** Tira a sala deste servidor sem apagar o retrato (outro servidor assumiu). */
  private evict(code: string): void {
    const room = this.rooms.get(code);
    if (!room) return;
    room.dispose();
    this.rooms.delete(code);
    this.emptySince.delete(code);
    this.cancelPendingSave(code);
    logger.warn(`Sala ${code}: outro servidor assumiu. Saindo daqui.`);
    this.deps.onEvicted?.(code);
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
    this.renewTimer = setInterval(() => void this.renew(), RENEW_MS);
    this.renewTimer.unref();
  }

  /** Renova as posses de todas as salas daqui; as que foram perdidas saem deste servidor. */
  async renew(): Promise<void> {
    const codes = [...this.rooms.keys()];
    if (codes.length === 0) return;
    try {
      const lost = await this.deps.store.renew(
        codes,
        this.instanceId,
        LEASE_MS,
        this.snapshotTtlMs,
      );
      for (const code of lost) this.evict(code);
    } catch (error) {
      logger.warn("Falha ao renovar a posse das salas", error);
    }
  }

  private persistSoon(room: Room): void {
    if (this.shuttingDown || this.pendingSaves.has(room.code)) return;
    const timer = setTimeout(() => {
      this.pendingSaves.delete(room.code);
      void this.persist(room);
    }, SAVE_DEBOUNCE_MS);
    timer.unref();
    this.pendingSaves.set(room.code, timer);
  }

  private cancelPendingSave(code: string): void {
    const timer = this.pendingSaves.get(code);
    if (timer) clearTimeout(timer);
    this.pendingSaves.delete(code);
  }

  private track<T>(promise: Promise<T>): Promise<T> {
    this.savesInFlight.add(promise);
    void promise.finally(() => this.savesInFlight.delete(promise));
    return promise;
  }

  /** Grava o retrato agora. Se a posse tiver sido perdida, a sala sai deste servidor. */
  private async persist(room: Room): Promise<void> {
    if (this.rooms.get(room.code) !== room) return;
    try {
      const saved = await this.track(
        this.deps.store.save(this.snapshot(room), this.instanceId, this.snapshotTtlMs),
      );
      if (!saved && this.rooms.get(room.code) === room) this.evict(room.code);
    } catch (error) {
      logger.warn(`Falha ao salvar retrato da sala ${room.code}`, error);
    }
  }

  snapshot(room: Room): RoomSnapshot {
    return room.toSnapshot();
  }

  /** Grava na hora tudo o que estava esperando para salvar (usado nos testes e no desligamento). */
  async flush(): Promise<void> {
    const codes = [...this.pendingSaves.keys()];
    for (const code of codes) this.cancelPendingSave(code);
    await Promise.all(
      codes
        .map((code) => this.rooms.get(code))
        .flatMap((room) => (room ? [this.persist(room)] : [])),
    );
    await Promise.all([...this.savesInFlight]);
  }

  /**
   * Desligamento (SIGTERM, deploy): para os cronômetros, grava o retrato de cada sala e solta a
   * posse, para o servidor novo assumir na hora. Não apaga nada do store.
   */
  async shutdown(): Promise<number> {
    this.shuttingDown = true;
    this.stopTimers();
    const rooms = [...this.rooms.values()];
    for (const room of rooms) room.dispose();
    for (const code of [...this.pendingSaves.keys()]) this.cancelPendingSave(code);
    await Promise.all([...this.savesInFlight]);
    await Promise.all(
      rooms.map(async (room) => {
        try {
          await this.deps.store.save(room.toSnapshot(), this.instanceId, this.snapshotTtlMs);
          await this.deps.store.release(room.code, this.instanceId);
        } catch (error) {
          logger.warn(`Falha ao salvar a sala ${room.code} no desligamento`, error);
        }
      }),
    );
    this.rooms.clear();
    this.emptySince.clear();
    return rooms.length;
  }

  private stopTimers(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    if (this.renewTimer) clearInterval(this.renewTimer);
  }

  /** Fecha tudo sem salvar (testes). Para desligar guardando as salas, use `shutdown`. */
  async close(): Promise<void> {
    this.shuttingDown = true;
    this.stopTimers();
    for (const code of [...this.pendingSaves.keys()]) this.cancelPendingSave(code);
    for (const room of this.rooms.values()) room.dispose();
    this.rooms.clear();
    await this.deps.store.close();
  }
}
