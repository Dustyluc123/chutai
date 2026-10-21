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

/** De onde veio a imagem de um personagem e sob qual licença (para os créditos). */
export interface ImageCredit {
  author: string;
  /** Nome curto da licença, ex.: "CC BY-SA 4.0" ou "Domínio público". */
  license: string;
  licenseUrl?: string;
  /** Página do original (ex.: o arquivo no Wikimedia Commons). */
  source?: string;
}

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
  /** Autor e licença da imagem. Viaja junto com o personagem (JSON, banco e, no futuro, uploads). */
  imageCredit?: ImageCredit;
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
  /**
   * Mês em que os dados foram conferidos ("AAAA-MM"), para temas com dados que mudam
   * (clube atual, inscritos...). A página do tema mostra "Dados de outubro de 2026".
   */
  dataUpdatedAt?: string;
  attributes: ThemeAttribute[];
  characters: Character[];
}

/**
 * full    → todos os personagens têm imagem: modo Imagem normal
 * partial → pelo menos 75% (e no mínimo 10) têm: modo Imagem parcial, sem os que não têm imagem
 * none    → modo Imagem indisponível
 */
export type ImageModeAvailability = "full" | "partial" | "none";

export interface ThemeSummary {
  slug: string;
  name: string;
  description: string;
  emoji: string;
  color: ThemeColor;
  visibility: ThemeVisibility;
  characterCount: number;
  /** Se o modo Imagem pode ser escolhido neste tema (ver ImageModeAvailability). */
  imageMode: ImageModeAvailability;
  /** Quantos personagens têm imagem. */
  imageCharacterCount: number;
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

/**
 * classic → cada palpite mostra os atributos coloridos
 * image   → aparece a imagem borrada do personagem, mais nítida a cada chute errado ou dica
 * mixed   → alterna as rodadas: uma Clássica, uma Imagem, uma Clássica...
 */
export type GameMode = "classic" | "image" | "mixed";

/** Tipo de UMA rodada. No modo Misto, cada rodada tem o seu (o servidor avisa no começo). */
export type RoundKind = "classic" | "image";

export interface RoomSettings {
  themeSlug: string;
  mode: GameMode;
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
/** `countdown`: contagem antes da primeira rodada (5, 4, 3, 2, 1, Vai!). */
export type RoomPhase = "lobby" | "countdown" | "round" | "intermission" | "finished";

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
  /** Só no modo Imagem: nível de nitidez que o jogador já alcançou (0 = o mais borrado). */
  imageLevel?: number;
}

export interface RoundPublic {
  number: number;
  /** Tipo desta rodada (no Misto muda a cada rodada; nos outros modos é o do modo). */
  kind: RoundKind;
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

/**
 * Dados públicos de uma sala para a prévia do link (WhatsApp, redes).
 * Vem da rota HTTP `GET /rooms/:codigo/preview`. Nunca tem nada da rodada.
 */
export interface RoomPreview {
  code: string;
  host: { nickname: string; avatar: string } | null;
  theme: { name: string; emoji: string };
  players: number;
  maxPlayers: number;
  phase: RoomPhase;
}

/**
 * Pódio de uma partida terminada, para a imagem de compartilhar.
 * Vem da rota HTTP `GET /rooms/:codigo/result` (só enquanto a sala está no pódio).
 */
export interface RoomResult {
  code: string;
  theme: { name: string; emoji: string };
  rounds: number;
  playerCount: number;
  standings: { position: number; nickname: string; avatar: string; score: number }[];
}

/** Resposta da rota do desafio diário. A resposta do dia só vem depois de acertar. */
export type DailyResponse =
  | {
      ok: true;
      guess?: GuessResult;
      hint?: HintReveal;
      /** Só depois de acertar: o personagem do dia e o de ontem. */
      answer?: CharacterReveal;
      yesterday?: { name: string; emoji?: string; image?: string } | null;
    }
  | {
      ok: false;
      error: string;
      /** Novo desafio (virou o dia): o número de hoje. */ today?: number;
    };

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
  /** Tipo da próxima rodada (contagem e intervalo), para mostrar "Próxima: Imagem". */
  nextRoundKind?: RoundKind;
  /** Fase `countdown`: quando a contagem termina e a primeira rodada começa (horário do servidor). */
  countdownEndsAt?: number;
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
  /** Só no modo Imagem, durante a rodada. Os bytes chegam pelo evento `round:image`. */
  image?: {
    level: number;
    maxLevel: number;
    status: "loading" | "ready" | "error";
  };
}

/**
 * Uma versão degradada da imagem secreta, enviada só para o jogador que alcançou aquele nível.
 * Não há URL nem nome de arquivo: só os bytes, sem metadados, gerados de novo a cada rodada.
 */
export interface RoundImage {
  round: number;
  level: number;
  /** Maior nível possível durante a rodada (a imagem nítida só aparece na revelação). */
  maxLevel: number;
  mimeType: "image/webp";
  /** Buffer no servidor; ArrayBuffer no navegador. */
  data: Uint8Array | ArrayBuffer;
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
