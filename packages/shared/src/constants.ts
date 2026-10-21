import type { RoomSettings } from "./types";

/** Avatares disponíveis para os jogadores. Fauna e coisas do Brasil. */
export const AVATARS = [
  "🦜",
  "🐆",
  "🐊",
  "🦥",
  "🐒",
  "🦩",
  "🐢",
  "🐸",
  "🦋",
  "🐝",
  "🌵",
  "🍍",
  "🥥",
  "⚽",
  "🎸",
  "🌶️",
  "🐜",
] as const;

export type Avatar = (typeof AVATARS)[number];

/** Letras do código da sala. Sem 0/O e 1/I/L para ninguém digitar errado. */
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 6;

export const LIMITS = {
  nickname: { min: 2, max: 20 },
  rounds: { min: 1, max: 10 },
  roundSeconds: { min: 30, max: 300 },
  maxPlayers: { min: 2, max: 12 },
} as const;

export const DEFAULT_SETTINGS: RoomSettings = {
  themeSlug: "folclore-brasileiro",
  mode: "classic",
  rounds: 5,
  roundSeconds: 90,
  hintsEnabled: true,
  maxPlayers: 8,
};

export const ROUND_SECONDS_OPTIONS = [45, 60, 90, 120, 180] as const;
export const ROUNDS_OPTIONS = [3, 5, 7, 10] as const;
