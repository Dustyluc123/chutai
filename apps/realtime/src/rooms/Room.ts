/**
 * Estado e regras de UMA sala. Não sabe nada de Socket.IO: recebe as intenções
 * dos jogadores, aplica as regras de @chutai/game e avisa o mundo pelo `emitter`.
 * Isso deixa a sala fácil de testar (tests/room.test.ts usa relógio falso).
 */
import { randomUUID } from "node:crypto";
import type {
  Character,
  FinalStanding,
  GuessResult,
  HintReveal,
  HintType,
  PlayerProgress,
  PrivateState,
  PublicPlayer,
  RoomPhase,
  RoomSettings,
  RoomState,
  RoundSummary,
  ServerToClientEvents,
  Theme,
} from "@chutai/shared";
import {
  TIMING,
  buildHint,
  canRequestHint,
  compareCharacters,
  computeRoundPoints,
  countCorrect,
  drawCharacter,
  formatValue,
} from "@chutai/game";
import { toThemeSummary, type MatchRecord } from "@chutai/db";
import { GameError } from "../lib/errors";

export interface PlayerState {
  id: string;
  nickname: string;
  avatar: string;
  token: string;
  score: number;
  connected: boolean;
  joinedAt: number;
  disconnectTimer?: () => void;
}

interface RoundPlayer {
  guesses: GuessResult[];
  guessTimes: number[];
  hints: HintReveal[];
  solvedAt?: number;
  solveRank?: number;
  points: number;
}

interface ActiveRound {
  number: number;
  character: Character;
  startedAt: number;
  endsAt: number;
  players: Map<string, RoundPlayer>;
  solveCount: number;
}

type EventName = keyof ServerToClientEvents;
type EventArgs<E extends EventName> = Parameters<ServerToClientEvents[E]>;

/** Como a sala fala com o mundo. O servidor implementa com Socket.IO; os testes, com arrays. */
export interface RoomEmitter {
  broadcast<E extends EventName>(event: E, ...args: EventArgs<E>): void;
  toPlayer<E extends EventName>(playerId: string, event: E, ...args: EventArgs<E>): void;
}

export interface RoomDeps {
  emitter: RoomEmitter;
  now?: () => number;
  /** Agenda uma função e devolve como cancelar. */
  schedule?: (fn: () => void, ms: number) => () => void;
  random?: () => number;
  disconnectGraceMs?: number;
  intermissionMs?: number;
  /** Chamado quando a partida termina (para salvar o histórico). */
  onFinished?: (record: MatchRecord) => void;
  /** Chamado quando o estado muda (para salvar retrato no Redis, por exemplo). */
  onChange?: (room: Room) => void;
}

const defaultSchedule = (fn: () => void, ms: number) => {
  const timer = setTimeout(fn, ms);
  return () => clearTimeout(timer);
};

export class Room {
  readonly code: string;
  readonly createdAt: number;
  settings: RoomSettings;
  theme: Theme;
  hostId = "";
  phase: RoomPhase = "lobby";
  readonly players = new Map<string, PlayerState>();

  private round?: ActiveRound;
  private lastRound?: RoundSummary;
  private standings?: FinalStanding[];
  private intermissionEndsAt?: number;
  private usedCharacterIds = new Set<string>();
  private history: { summary: RoundSummary; record: MatchRecord["rounds"][number] }[] = [];
  private matchStartedAt?: number;
  private cancelTimer?: () => void;

  private readonly emitter: RoomEmitter;
  private readonly now: () => number;
  private readonly schedule: (fn: () => void, ms: number) => () => void;
  private readonly random: () => number;
  private readonly disconnectGraceMs: number;
  private readonly intermissionMs: number;
  private readonly onFinished?: (record: MatchRecord) => void;
  private readonly onChange?: (room: Room) => void;

  constructor(code: string, theme: Theme, settings: RoomSettings, deps: RoomDeps) {
    this.code = code;
    this.theme = theme;
    this.settings = { ...settings, themeSlug: theme.slug };
    this.emitter = deps.emitter;
    this.now = deps.now ?? Date.now;
    this.schedule = deps.schedule ?? defaultSchedule;
    this.random = deps.random ?? Math.random;
    this.disconnectGraceMs = deps.disconnectGraceMs ?? 20_000;
    this.intermissionMs = deps.intermissionMs ?? TIMING.intermissionSeconds * 1000;
    this.onFinished = deps.onFinished;
    this.onChange = deps.onChange;
    this.createdAt = this.now();
  }

  // -------------------------------------------------------------------------
  // Jogadores
  // -------------------------------------------------------------------------

  get connectedPlayers(): PlayerState[] {
    return [...this.players.values()].filter((player) => player.connected);
  }

  addPlayer(nickname: string, avatar: string): PlayerState {
    if (this.players.size >= this.settings.maxPlayers) throw new GameError("A sala está cheia.");
    const taken = [...this.players.values()].some(
      (player) => player.nickname.toLowerCase() === nickname.toLowerCase(),
    );
    const player: PlayerState = {
      id: randomUUID(),
      nickname: taken ? `${nickname} ${this.players.size + 1}` : nickname,
      avatar,
      token: randomUUID(),
      score: 0,
      connected: true,
      joinedAt: this.now(),
    };
    this.players.set(player.id, player);
    if (!this.hostId) this.hostId = player.id;
    this.changed();
    return player;
  }

  /** Recupera um jogador pelo token salvo no navegador (reconexão). */
  findByToken(token: string): PlayerState | undefined {
    return [...this.players.values()].find((player) => player.token === token);
  }

  setConnected(playerId: string, connected: boolean): void {
    const player = this.players.get(playerId);
    if (!player) return;
    player.connected = connected;
    player.disconnectTimer?.();
    player.disconnectTimer = undefined;

    if (!connected) {
      // Dá um tempo para quem só recarregou a página voltar sem perder o lugar.
      player.disconnectTimer = this.schedule(() => {
        player.disconnectTimer = undefined;
        if (player.connected) return;
        if (this.phase === "lobby") this.removePlayer(player.id);
        else this.migrateHostIfNeeded();
      }, this.disconnectGraceMs);
    }

    this.changed();
    // Se todo mundo que ainda está conectado já acertou, não precisa esperar o cronômetro.
    if (this.phase === "round") this.endRoundIfEveryoneSolved();
  }

  removePlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;
    player.disconnectTimer?.();
    this.players.delete(playerId);
    this.migrateHostIfNeeded();
    this.changed();
    if (this.phase === "round") this.endRoundIfEveryoneSolved();
  }

  kick(byId: string, targetId: string): void {
    this.assertHost(byId);
    if (byId === targetId) throw new GameError("Você não pode expulsar a si mesmo.");
    if (!this.players.has(targetId)) throw new GameError("Jogador não encontrado.");
    this.emitter.toPlayer(targetId, "room:kicked");
    this.removePlayer(targetId);
  }

  private migrateHostIfNeeded(): void {
    const host = this.players.get(this.hostId);
    if (host?.connected) return;
    const next = this.connectedPlayers.sort((a, b) => a.joinedAt - b.joinedAt)[0];
    if (next) this.hostId = next.id;
    else if (!host) this.hostId = [...this.players.keys()][0] ?? "";
    this.changed();
  }

  // -------------------------------------------------------------------------
  // Configurações
  // -------------------------------------------------------------------------

  updateSettings(byId: string, changes: Partial<RoomSettings>, theme?: Theme): void {
    this.assertHost(byId);
    if (this.phase !== "lobby") throw new GameError("Só dá para mudar as regras no lobby.");
    if (changes.maxPlayers !== undefined && changes.maxPlayers < this.players.size) {
      throw new GameError("Já tem mais jogadores na sala do que esse limite.");
    }
    if (theme) this.theme = theme;
    this.settings = { ...this.settings, ...changes, themeSlug: this.theme.slug };
    this.changed();
  }

  // -------------------------------------------------------------------------
  // Partida
  // -------------------------------------------------------------------------

  start(byId: string): void {
    this.assertHost(byId);
    if (this.phase !== "lobby") throw new GameError("A partida já começou.");
    if (this.connectedPlayers.length === 0) throw new GameError("Não há jogadores conectados.");

    for (const player of this.players.values()) player.score = 0;
    this.usedCharacterIds.clear();
    this.history = [];
    this.lastRound = undefined;
    this.standings = undefined;
    this.matchStartedAt = this.now();
    this.startRound(1);
  }

  /** Depois do pódio, o anfitrião leva todo mundo de volta ao lobby. */
  restart(byId: string): void {
    this.assertHost(byId);
    if (this.phase !== "finished") throw new GameError("A partida ainda não terminou.");
    this.cancelTimer?.();
    this.phase = "lobby";
    this.round = undefined;
    this.lastRound = undefined;
    this.standings = undefined;
    for (const player of this.players.values()) player.score = 0;
    // Quem saiu durante a partida deixa a sala agora.
    for (const player of [...this.players.values()]) {
      if (!player.connected) this.players.delete(player.id);
    }
    this.migrateHostIfNeeded();
    this.changed();
  }

  private startRound(number: number): void {
    this.cancelTimer?.();
    const character = drawCharacter(this.theme.characters, this.usedCharacterIds, this.random);
    this.usedCharacterIds.add(character.id);

    const startedAt = this.now();
    const endsAt = startedAt + this.settings.roundSeconds * 1000;
    this.round = { number, character, startedAt, endsAt, players: new Map(), solveCount: 0 };
    this.phase = "round";
    this.intermissionEndsAt = undefined;
    this.cancelTimer = this.schedule(() => this.endRound(), endsAt - startedAt);

    this.emitter.broadcast("round:start", { number, endsAt });
    for (const player of this.players.values()) this.sendPrivate(player.id);
    this.changed();
  }

  private roundPlayer(playerId: string): RoundPlayer {
    const round = this.requireRound();
    let state = round.players.get(playerId);
    if (!state) {
      state = { guesses: [], guessTimes: [], hints: [], points: 0 };
      round.players.set(playerId, state);
    }
    return state;
  }

  guess(playerId: string, characterId: string): GuessResult {
    const round = this.requireRound();
    const player = this.requirePlayer(playerId);
    const state = this.roundPlayer(playerId);
    if (state.solvedAt !== undefined) throw new GameError("Você já acertou esta rodada.");

    const guessed = this.theme.characters.find((character) => character.id === characterId);
    if (!guessed) throw new GameError("Esse personagem não faz parte do tema.");
    if (state.guesses.some((item) => item.characterId === characterId)) {
      throw new GameError("Você já chutou esse personagem.");
    }

    const feedback = compareCharacters(guessed, round.character, this.theme.attributes);
    const correct = guessed.id === round.character.id;
    const result: GuessResult = {
      characterId: guessed.id,
      characterName: guessed.name,
      emoji: guessed.emoji,
      image: guessed.image,
      feedback,
      correct,
      guessNumber: state.guesses.length + 1,
    };
    const now = this.now();
    state.guesses.push(result);
    state.guessTimes.push(now - round.startedAt);

    if (correct) {
      round.solveCount += 1;
      state.solvedAt = now;
      state.solveRank = round.solveCount;
      state.points = computeRoundPoints({
        remainingMs: Math.max(0, round.endsAt - now),
        totalMs: round.endsAt - round.startedAt,
        guesses: state.guesses.length,
        hintsUsed: state.hints.length,
        solveRank: state.solveRank,
      });
      player.score += state.points;
      this.emitter.broadcast("player:solved", {
        playerId,
        nickname: player.nickname,
        rank: state.solveRank,
      });
    }

    this.emitter.broadcast("player:progress", this.progressOf(playerId));
    this.changed();
    if (correct) this.endRoundIfEveryoneSolved();
    return result;
  }

  hint(playerId: string, type: HintType): HintReveal {
    const round = this.requireRound();
    this.requirePlayer(playerId);
    const state = this.roundPlayer(playerId);
    const check = canRequestHint(type, {
      hintsEnabled: this.settings.hintsEnabled,
      guesses: state.guesses,
      hintsUsed: state.hints,
      solved: state.solvedAt !== undefined,
    });
    if (!check.allowed) throw new GameError(check.reason);

    const hint = buildHint(type, round.character, this.theme.attributes, state.guesses);
    state.hints.push(hint);
    this.emitter.broadcast("player:progress", this.progressOf(playerId));
    this.changed();
    return hint;
  }

  private endRoundIfEveryoneSolved(): void {
    const round = this.round;
    if (!round || this.phase !== "round") return;
    const active = this.connectedPlayers;
    if (active.length === 0) return;
    const everyoneSolved = active.every(
      (player) => round.players.get(player.id)?.solvedAt !== undefined,
    );
    if (everyoneSolved) this.endRound();
  }

  /** Termina a rodada (tempo esgotado ou todos acertaram) e revela o personagem. */
  endRound(): void {
    const round = this.round;
    if (!round || this.phase !== "round") return;
    this.cancelTimer?.();

    const summary: RoundSummary = {
      number: round.number,
      character: {
        id: round.character.id,
        name: round.character.name,
        emoji: round.character.emoji,
        image: round.character.image,
        values: this.theme.attributes.map((attr) => ({
          key: attr.key,
          label: attr.label,
          display: formatValue(attr, round.character.values[attr.key]),
        })),
      },
      results: [...this.players.values()]
        .map((player) => {
          const state = round.players.get(player.id);
          return {
            playerId: player.id,
            solved: state?.solvedAt !== undefined,
            guesses: state?.guesses.length ?? 0,
            hintsUsed: state?.hints.length ?? 0,
            points: state?.points ?? 0,
            timeMs: state?.solvedAt !== undefined ? state.solvedAt - round.startedAt : undefined,
            solveRank: state?.solveRank,
          };
        })
        .sort((a, b) => b.points - a.points),
    };

    this.history.push({
      summary,
      record: {
        number: round.number,
        characterId: round.character.id,
        guesses: [...round.players.entries()].flatMap(([playerId, state]) =>
          state.guesses.map((guess, index) => ({
            playerKey: playerId,
            characterId: guess.characterId,
            timeMs: state.guessTimes[index] ?? 0,
            order: index + 1,
          })),
        ),
      },
    });
    this.lastRound = summary;
    this.emitter.broadcast("round:end", summary);

    if (round.number >= this.settings.rounds) {
      this.finish();
      return;
    }

    this.phase = "intermission";
    this.intermissionEndsAt = this.now() + this.intermissionMs;
    this.cancelTimer = this.schedule(() => this.startRound(round.number + 1), this.intermissionMs);
    this.changed();
  }

  private finish(): void {
    this.phase = "finished";
    this.round = undefined;
    this.intermissionEndsAt = undefined;
    this.standings = this.computeStandings();
    this.emitter.broadcast("game:end", this.standings);
    this.changed();
    this.onFinished?.(this.toMatchRecord());
  }

  private computeStandings(): FinalStanding[] {
    const sorted = [...this.players.values()].sort((a, b) => b.score - a.score);
    const standings: FinalStanding[] = [];
    sorted.forEach((player, index) => {
      const previous = standings[index - 1];
      const position = previous && previous.score === player.score ? previous.position : index + 1;
      standings.push({
        playerId: player.id,
        nickname: player.nickname,
        avatar: player.avatar,
        score: player.score,
        position,
        roundsSolved: this.history.filter((item) =>
          item.summary.results.some((result) => result.playerId === player.id && result.solved),
        ).length,
      });
    });
    return standings;
  }

  toMatchRecord(): MatchRecord {
    return {
      themeSlug: this.theme.slug,
      roomCode: this.code,
      startedAt: new Date(this.matchStartedAt ?? this.createdAt),
      finishedAt: new Date(this.now()),
      settings: this.settings,
      players: (this.standings ?? this.computeStandings()).map((standing) => ({
        key: standing.playerId,
        nickname: standing.nickname,
        avatar: standing.avatar,
        points: standing.score,
        position: standing.position,
      })),
      rounds: this.history.map((item) => item.record),
    };
  }

  // -------------------------------------------------------------------------
  // Estado para o navegador
  // -------------------------------------------------------------------------

  private progressOf(playerId: string): PlayerProgress {
    const state = this.round?.players.get(playerId);
    return {
      playerId,
      guessCount: state?.guesses.length ?? 0,
      bestMatch: Math.max(
        0,
        ...(state?.guesses.map((guess) => countCorrect(guess.feedback)) ?? []),
      ),
      solved: state?.solvedAt !== undefined,
      solveRank: state?.solveRank,
      hintsUsed: state?.hints.length ?? 0,
    };
  }

  toPublicState(): RoomState {
    const players: PublicPlayer[] = [...this.players.values()]
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((player) => ({
        id: player.id,
        nickname: player.nickname,
        avatar: player.avatar,
        isHost: player.id === this.hostId,
        connected: player.connected,
        score: player.score,
      }));

    return {
      code: this.code,
      phase: this.phase,
      hostId: this.hostId,
      settings: this.settings,
      theme: toThemeSummary(this.theme),
      players,
      round: this.round
        ? {
            number: this.round.number,
            totalRounds: this.settings.rounds,
            startedAt: this.round.startedAt,
            endsAt: this.round.endsAt,
            attributeCount: this.theme.attributes.length,
            progress: players.map((player) => this.progressOf(player.id)),
          }
        : undefined,
      lastRound: this.phase === "lobby" ? undefined : this.lastRound,
      intermissionEndsAt: this.intermissionEndsAt,
      standings: this.phase === "finished" ? this.standings : undefined,
      serverNow: this.now(),
    };
  }

  privateState(playerId: string): PrivateState {
    const state = this.phase === "round" ? this.round?.players.get(playerId) : undefined;
    return {
      playerId,
      guesses: state?.guesses ?? [],
      hints: state?.hints ?? [],
      solved: state?.solvedAt !== undefined,
    };
  }

  sendPrivate(playerId: string): void {
    this.emitter.toPlayer(playerId, "you:state", this.privateState(playerId));
  }

  /** Só para testes: qual é a resposta da rodada atual. Nunca enviado ao navegador. */
  peekAnswerForTests(): Character | undefined {
    return this.round?.character;
  }

  dispose(): void {
    this.cancelTimer?.();
    for (const player of this.players.values()) player.disconnectTimer?.();
  }

  private changed(): void {
    this.emitter.broadcast("room:state", this.toPublicState());
    this.onChange?.(this);
  }

  private assertHost(playerId: string): void {
    if (playerId !== this.hostId) throw new GameError("Só o anfitrião pode fazer isso.");
  }

  private requirePlayer(playerId: string): PlayerState {
    const player = this.players.get(playerId);
    if (!player) throw new GameError("Você não está nesta sala.");
    return player;
  }

  private requireRound(): ActiveRound {
    if (this.phase !== "round" || !this.round) throw new GameError("Não há rodada em andamento.");
    return this.round;
  }
}
