/**
 * Tipos de domínio compartilhados entre o site (apps/web) e o servidor de tempo real (apps/realtime).
 * Os identificadores ficam em inglês (padrão de mercado); textos para o jogador ficam em português.
 */

// ---------------------------------------------------------------------------
// Temas e personagens
// ---------------------------------------------------------------------------

/**
 * Como um atributo é comparado:
 * - text:   igual (verde) ou diferente (vermelho). Ex.: região, posição
 * - list:   todos iguais (verde), alguns em comum (amarelo) ou nenhum (vermelho). Ex.: biomas
 * - number: igual (verde) ou seta indicando se a resposta é maior/menor. Ex.: ano de nascimento
 * - range:  número com margem; amarelo quando está dentro da tolerância. Ex.: peso com ±20%
 */
export type AttributeType = "text" | "list" | "number" | "range";

export interface ThemeAttribute {
  key: string;
  label: string;
  type: AttributeType;
  /** Unidade exibida depois de valores numéricos (ex.: "kg"). */
  unit?: string;
  /**
   * Só para `range`: margem para o amarelo. Se `toleranceIsPercent` for true,
   * o valor é uma porcentagem da resposta (ex.: 25 = ±25%).
   */
  tolerance?: number;
  toleranceIsPercent?: boolean;
}

export type AttributeValue = string | number | string[];

export interface Character {
  id: string;
  name: string;
  /** Outros nomes aceitos no autocompletar (ex.: "Fenômeno" → Ronaldo). */
  aliases?: string[];
  /** Emoji usado como avatar do personagem quando não há imagem. */
  emoji?: string;
  /**
   * Imagem do personagem: caminho no site (ex.: "/temas/fauna-brasileira/capivara.webp")
   * ou URL completa (para temas da comunidade, no futuro). Sem imagem, o site mostra o emoji.
   */
  image?: string;
  values: Record<string, AttributeValue>;
}

export type ThemeVisibility = "official" | "public" | "private";

/** Cores de destaque disponíveis para temas (mapeadas para tokens de cor no site). */
export type ThemeColor = "anil" | "gema" | "chiclete" | "folha" | "laranja";

export interface Theme {
  slug: string;
  name: string;
  description: string;
  emoji: string;
  color: ThemeColor;
  visibility: ThemeVisibility;
  attributes: ThemeAttribute[];
  characters: Character[];
}

export interface ThemeSummary {
  slug: string;
  name: string;
  description: string;
  emoji: string;
  color: ThemeColor;
  visibility: ThemeVisibility;
  characterCount: number;
  attributes: Pick<ThemeAttribute, "key" | "label">[];
}

/** O que o navegador precisa para o autocompletar: nunca inclui qual é a resposta. */
export interface CharacterOption {
  id: string;
  name: string;
  aliases: string[];
  emoji?: string;
  image?: string;
}

// ---------------------------------------------------------------------------
// Palpites e dicas
// ---------------------------------------------------------------------------

export type FeedbackStatus = "correct" | "partial" | "wrong";

/** "up" = a resposta é MAIOR que o palpite; "down" = a resposta é MENOR. */
export type FeedbackDirection = "up" | "down";

export interface AttributeFeedback {
  key: string;
  /** Valor do personagem chutado, já formatado para exibição. */
  display: string;
  status: FeedbackStatus;
  direction?: FeedbackDirection;
}

export interface GuessResult {
  characterId: string;
  characterName: string;
  emoji?: string;
  image?: string;
  feedback: AttributeFeedback[];
  correct: boolean;
  /** 1 para o primeiro chute da rodada, 2 para o segundo... */
  guessNumber: number;
}

export type HintType = "attribute" | "firstLetter";

export interface HintReveal {
  type: HintType;
  text: string;
  attributeKey?: string;
}

// ---------------------------------------------------------------------------
// Salas
// ---------------------------------------------------------------------------

export interface RoomSettings {
  themeSlug: string;
  rounds: number;
  roundSeconds: number;
  hintsEnabled: boolean;
  maxPlayers: number;
}

/**
 * lobby        → esperando o anfitrião começar
 * round        → rodada em andamento
 * intermission → personagem revelado, contagem para a próxima rodada
 * finished     → partida terminou, pódio na tela
 */
export type RoomPhase = "lobby" | "round" | "intermission" | "finished";

export interface PublicPlayer {
  id: string;
  nickname: string;
  avatar: string;
  isHost: boolean;
  connected: boolean;
  score: number;
}

/** Progresso que todos veem, sem spoiler: quantos chutes e quão perto chegou. */
export interface PlayerProgress {
  playerId: string;
  guessCount: number;
  /** Maior número de atributos verdes em um único palpite. */
  bestMatch: number;
  solved: boolean;
  /** 1 = primeiro a acertar. */
  solveRank?: number;
  hintsUsed: number;
}

export interface RoundPublic {
  number: number;
  totalRounds: number;
  startedAt: number;
  endsAt: number;
  attributeCount: number;
  progress: PlayerProgress[];
}

export interface CharacterReveal {
  id: string;
  name: string;
  emoji?: string;
  /** Só é enviada depois que a rodada termina. */
  image?: string;
  values: { key: string; label: string; display: string }[];
}

export interface RoundPlayerResult {
  playerId: string;
  solved: boolean;
  guesses: number;
  hintsUsed: number;
  points: number;
  /** Tempo até acertar, em milissegundos. */
  timeMs?: number;
  solveRank?: number;
}

export interface RoundSummary {
  number: number;
  character: CharacterReveal;
  results: RoundPlayerResult[];
}

export interface FinalStanding {
  playerId: string;
  nickname: string;
  avatar: string;
  score: number;
  position: number;
  roundsSolved: number;
}

export interface RoomState {
  code: string;
  phase: RoomPhase;
  hostId: string;
  settings: RoomSettings;
  theme: ThemeSummary;
  players: PublicPlayer[];
  round?: RoundPublic;
  lastRound?: RoundSummary;
  intermissionEndsAt?: number;
  standings?: FinalStanding[];
  /** Relógio do servidor, para o navegador corrigir a diferença no cronômetro. */
  serverNow: number;
}

/** Estado que só o próprio jogador recebe. */
export interface PrivateState {
  playerId: string;
  guesses: GuessResult[];
  hints: HintReveal[];
  solved: boolean;
}

// ---------------------------------------------------------------------------
// Respostas dos eventos (acknowledgements do Socket.IO)
// ---------------------------------------------------------------------------

export type Ack<T> = { ok: true; data: T } | { ok: false; error: string };

export interface JoinedRoom {
  code: string;
  playerId: string;
  /** Guardado no navegador para voltar à mesma sala se a conexão cair. */
  token: string;
}
