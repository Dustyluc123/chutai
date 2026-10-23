import type {
  FinalStanding,
  GuessResult,
  HintReveal,
  RoomPhase,
  RoomSettings,
  RoundKind,
  RoundSummary,
} from "@chutai/shared";
import type { MatchRecord } from "@chutai/db";

/** Retrato de um jogador. `score` e `connected` só existem nos retratos novos. */
export interface PlayerSnapshot {
  id: string;
  nickname: string;
  avatar: string;
  token: string;
  joinedAt: number;
  score?: number;
}

/** Retrato da rodada em andamento. A resposta (`characterId`) fica só no servidor e no Redis. */
export interface RoundSnapshot {
  number: number;
  kind: RoundKind;
  characterId: string;
  startedAt: number;
  endsAt: number;
  solveCount: number;
  /** Semente do disfarce do modo Imagem: gera de novo exatamente as mesmas imagens. */
  imageSeed?: number;
  players: {
    playerId: string;
    guesses: GuessResult[];
    guessTimes: number[];
    hints: HintReveal[];
    solvedAt?: number;
    solveRank?: number;
    points: number;
  }[];
}

/**
 * Retrato de uma sala que dá para salvar fora da memória (Redis).
 *
 * Desde a versão 2 entra a partida inteira (fase, rodada, chutes, pontos e os horários de término):
 * depois de um reinício, a sala continua de onde parou e os cronômetros seguem pelo horário salvo.
 * Retratos antigos (sem `version`) só têm o lobby: voltam para o lobby, como antes.
 */
export interface RoomSnapshot {
  version?: 2;
  code: string;
  themeSlug: string;
  settings: RoomSettings;
  hostId: string;
  createdAt: number;
  players: PlayerSnapshot[];
  phase?: RoomPhase;
  round?: RoundSnapshot;
  lastRound?: RoundSummary;
  standings?: FinalStanding[];
  intermissionEndsAt?: number;
  countdownEndsAt?: number;
  usedCharacterIds?: string[];
  history?: { summary: RoundSummary; record: MatchRecord["rounds"][number] }[];
  matchStartedAt?: number;
  pausedRound?: number;
  /** Quando o retrato foi salvo (só para os logs). */
  savedAt?: number;
}

/**
 * Onde os retratos ficam. Cada sala tem um dono (a "posse"): só o servidor dono roda os
 * cronômetros e grava o retrato. A posse expira sozinha se o dono sumir sem avisar, e o
 * servidor que vier depois assume. Isso evita duas rodadas da mesma sala andando ao mesmo tempo
 * durante um deploy (quando o servidor antigo e o novo ficam ligados juntos por alguns segundos).
 */
export interface RoomStore {
  readonly kind: "memory" | "redis";
  /** Tenta virar (ou continuar) dono da sala por `ttlMs`. */
  acquire(code: string, owner: string, ttlMs: number): Promise<boolean>;
  /** Renova as posses (e a validade dos retratos). Devolve os códigos cuja posse foi perdida. */
  renew(codes: string[], owner: string, ttlMs: number, snapshotTtlMs: number): Promise<string[]>;
  /** Solta a posse (desligamento): outro servidor pode assumir na hora. */
  release(code: string, owner: string): Promise<void>;
  /** Grava o retrato só se `owner` ainda for o dono. Devolve false se a posse foi perdida. */
  save(snapshot: RoomSnapshot, owner: string, snapshotTtlMs: number): Promise<boolean>;
  load(code: string): Promise<RoomSnapshot | undefined>;
  /** Já existe uma sala com esse código (retrato ou posse)? Para não repetir códigos. */
  exists(code: string): Promise<boolean>;
  /** Apaga retrato e posse (se a posse for de `owner` ou de ninguém). */
  delete(code: string, owner: string): Promise<void>;
  close(): Promise<void>;
}
