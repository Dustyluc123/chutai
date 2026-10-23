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
import { z } from "zod";

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
 * Versão do formato do retrato. Mude quando o formato mudar de um jeito que o código novo não
 * saiba ler: retratos de outra versão (ou sem versão) são ignorados e apagados ao serem lidos.
 */
export const SNAPSHOT_VERSION = 2;

/**
 * Retrato de uma sala que dá para salvar fora da memória (Redis): a partida inteira (fase,
 * rodada, chutes, pontos e os horários de término). Depois de um reinício, a sala continua de
 * onde parou e os cronômetros seguem pelo horário salvo. Lido sempre por `parseSnapshot`.
 */
export interface RoomSnapshot {
  version: typeof SNAPSHOT_VERSION;
  code: string;
  themeSlug: string;
  settings: RoomSettings;
  hostId: string;
  createdAt: number;
  players: PlayerSnapshot[];
  phase: RoomPhase;
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

/**
 * Formato mínimo que um retrato precisa ter para ser restaurado. Confere a versão e os campos
 * que a sala usa ao voltar; o resto (resultados de chutes, pódio) passa como veio.
 */
const snapshotSchema = z
  .object({
    version: z.literal(SNAPSHOT_VERSION),
    code: z.string().min(1),
    themeSlug: z.string().min(1),
    settings: z.object({}).passthrough(),
    hostId: z.string(),
    createdAt: z.number(),
    players: z.array(
      z
        .object({
          id: z.string(),
          nickname: z.string(),
          avatar: z.string(),
          token: z.string(),
          joinedAt: z.number(),
          score: z.number().optional(),
        })
        .passthrough(),
    ),
    phase: z.enum(["lobby", "countdown", "round", "intermission", "finished"]),
    round: z
      .object({
        number: z.number(),
        kind: z.enum(["classic", "image"]),
        characterId: z.string(),
        startedAt: z.number(),
        endsAt: z.number(),
        solveCount: z.number(),
        imageSeed: z.number().optional(),
        players: z.array(
          z
            .object({
              playerId: z.string(),
              guesses: z.array(z.object({ characterId: z.string() }).passthrough()),
              guessTimes: z.array(z.number()),
              hints: z.array(z.object({}).passthrough()),
              points: z.number(),
            })
            .passthrough(),
        ),
      })
      .passthrough()
      .optional(),
    usedCharacterIds: z.array(z.string()).optional(),
    history: z.array(z.object({}).passthrough()).optional(),
  })
  .passthrough();

/**
 * Lê um retrato salvo. Devolve `undefined` (nunca lança) se não for JSON, se for de uma versão
 * antiga ou desconhecida, ou se faltar algum campo: quem chamou apaga a chave.
 */
export function parseSnapshot(raw: string): RoomSnapshot | undefined {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return undefined;
  }
  const parsed = snapshotSchema.safeParse(value);
  return parsed.success ? (value as RoomSnapshot) : undefined;
}
