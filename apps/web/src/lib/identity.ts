"use client";

import { AVATARS, type Avatar, type JoinedRoom } from "@chutai/shared";

/**
 * O que o navegador lembra do jogador. Não há login no MVP:
 * guardamos apelido/avatar e o "token" de cada sala para reconectar.
 */
const PROFILE_KEY = "chutai:perfil";
const roomKey = (code: string) => `chutai:sala:${code.toUpperCase()}`;

export interface Profile {
  nickname: string;
  avatar: Avatar;
}

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Navegação privada ou armazenamento bloqueado: o jogo funciona, só não lembra.
  }
}

export function loadProfile(): Profile | null {
  const profile = read<Profile>(PROFILE_KEY);
  if (!profile || !AVATARS.includes(profile.avatar)) return null;
  return profile;
}

export function saveProfile(profile: Profile) {
  write(PROFILE_KEY, profile);
}

export function randomAvatar(): Avatar {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)]!;
}

export function loadRoomSession(code: string): JoinedRoom | null {
  return read<JoinedRoom>(roomKey(code));
}

export function saveRoomSession(session: JoinedRoom) {
  write(roomKey(session.code), session);
}

export function clearRoomSession(code: string) {
  try {
    window.localStorage.removeItem(roomKey(code));
  } catch {
    // ignora
  }
}
