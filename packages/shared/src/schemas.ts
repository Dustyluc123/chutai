/**
 * Validação com Zod. O servidor valida TUDO que chega do navegador antes de usar,
 * e o site usa os mesmos esquemas nos formulários.
 */
import { z } from "zod";
import { AVATARS, LIMITS, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from "./constants";

export const nicknameSchema = z
  .string()
  .trim()
  .min(LIMITS.nickname.min, `O apelido precisa de pelo menos ${LIMITS.nickname.min} letras.`)
  .max(LIMITS.nickname.max, `O apelido pode ter no máximo ${LIMITS.nickname.max} letras.`)
  .regex(/^[\p{L}\p{N} _.-]+$/u, "Use só letras, números, espaço, ponto, hífen ou _.");

export const avatarSchema = z.enum(AVATARS);

export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(ROOM_CODE_LENGTH, `O código tem ${ROOM_CODE_LENGTH} caracteres.`)
  .refine((code) => [...code].every((ch) => ROOM_CODE_ALPHABET.includes(ch)), "Código inválido.");

export const roomSettingsSchema = z.object({
  themeSlug: z.string().min(1).max(64),
  rounds: z.number().int().min(LIMITS.rounds.min).max(LIMITS.rounds.max),
  roundSeconds: z.number().int().min(LIMITS.roundSeconds.min).max(LIMITS.roundSeconds.max),
  hintsEnabled: z.boolean(),
  maxPlayers: z.number().int().min(LIMITS.maxPlayers.min).max(LIMITS.maxPlayers.max),
});

export const createRoomSchema = z.object({
  nickname: nicknameSchema,
  avatar: avatarSchema,
  settings: roomSettingsSchema.partial().optional(),
});

export const joinRoomSchema = z.object({
  code: roomCodeSchema,
  nickname: nicknameSchema,
  avatar: avatarSchema,
  token: z.string().min(10).max(100).optional(),
});

export const updateSettingsSchema = roomSettingsSchema.partial();

export const kickPlayerSchema = z.object({
  playerId: z.string().min(1).max(64),
});

export const submitGuessSchema = z.object({
  characterId: z.string().min(1).max(100),
});

export const requestHintSchema = z.object({
  type: z.enum(["attribute", "firstLetter"]),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type KickPlayerInput = z.infer<typeof kickPlayerSchema>;
export type SubmitGuessInput = z.infer<typeof submitGuessSchema>;
export type RequestHintInput = z.infer<typeof requestHintSchema>;

/** Pega a primeira mensagem de erro de um resultado do Zod, para mostrar ao jogador. */
export function firstZodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Dados inválidos.";
}
