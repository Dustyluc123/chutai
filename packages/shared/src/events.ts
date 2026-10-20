/**
 * Contrato dos eventos do Socket.IO. Site e servidor importam estas interfaces,
 * então um evento com nome ou formato errado vira erro de compilação.
 *
 * Regra de ouro: o servidor manda em tudo. O navegador envia intenções
 * (criar sala, chutar, pedir dica) e recebe o resultado já calculado.
 */
import type {
  Ack,
  CharacterOption,
  GuessResult,
  HintReveal,
  JoinedRoom,
  PlayerProgress,
  PrivateState,
  RoomState,
  RoundImage,
  RoundSummary,
  FinalStanding,
} from "./types";
import type {
  CreateRoomInput,
  JoinRoomInput,
  KickPlayerInput,
  RequestHintInput,
  SubmitGuessInput,
  UpdateSettingsInput,
} from "./schemas";

type Callback<T> = (response: Ack<T>) => void;

/** Navegador → servidor */
export interface ClientToServerEvents {
  /** Cria uma sala; quem cria vira anfitrião. */
  "room:create": (payload: CreateRoomInput, ack: Callback<JoinedRoom>) => void;
  /** Entra numa sala pelo código. Com `token`, reconecta o mesmo jogador. */
  "room:join": (payload: JoinRoomInput, ack: Callback<JoinedRoom>) => void;
  "room:leave": () => void;
  /** Só o anfitrião, só no lobby. */
  "room:update-settings": (payload: UpdateSettingsInput, ack: Callback<null>) => void;
  /** Só o anfitrião. */
  "room:kick": (payload: KickPlayerInput, ack: Callback<null>) => void;
  /** Só o anfitrião: começa a partida. */
  "game:start": (ack: Callback<null>) => void;
  /** Só o anfitrião: volta todo mundo para o lobby depois do pódio. */
  "game:restart": (ack: Callback<null>) => void;
  "guess:submit": (payload: SubmitGuessInput, ack: Callback<GuessResult>) => void;
  "hint:request": (payload: RequestHintInput, ack: Callback<HintReveal>) => void;
}

/** Servidor → navegador */
export interface ServerToClientEvents {
  /** Fonte da verdade: enviado para a sala inteira a cada mudança. */
  "room:state": (state: RoomState) => void;
  /**
   * Personagens que podem ser chutados nesta partida (para o autocompletar). O servidor decide
   * a lista; no modo Imagem ela vem sem imagem e sem emoji, para não dar a resposta.
   */
  "room:characters": (characters: CharacterOption[]) => void;
  /** Só para o próprio jogador: seus palpites e dicas (ex.: depois de reconectar). */
  "you:state": (state: PrivateState) => void;
  /** Alguém progrediu na rodada (sem revelar nada). */
  "player:progress": (progress: PlayerProgress) => void;
  /** Alguém acertou: o site mostra um aviso "Fulano acertou!". */
  "player:solved": (payload: { playerId: string; nickname: string; rank: number }) => void;
  "round:start": (payload: { number: number; endsAt: number }) => void;
  "round:end": (summary: RoundSummary) => void;
  /** Modo Imagem: o nível de nitidez que ESTE jogador alcançou. Nunca vai para a sala inteira. */
  "round:image": (image: RoundImage) => void;
  "game:end": (standings: FinalStanding[]) => void;
  "room:kicked": () => void;
  "room:closed": (reason: string) => void;
}

/** Dados que o servidor guarda em cada conexão. */
export interface SocketData {
  playerId?: string;
  roomCode?: string;
}

export type InterServerEvents = Record<string, never>;
