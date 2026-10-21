"use client";

import { useSyncExternalStore } from "react";

/** Preferências de som da pessoa (salvas no localStorage). Efeitos ligados e música desligada. */
export interface SoundSettings {
  effects: boolean;
  music: boolean;
}

const KEY = "chutai:som";
const DEFAULTS: SoundSettings = { effects: true, music: false };
const listeners = new Set<() => void>();
let current: SoundSettings | undefined;

function read(): SoundSettings {
  if (current) return current;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<SoundSettings> | null;
    current = { ...DEFAULTS, ...saved };
  } catch {
    current = { ...DEFAULTS };
  }
  return current;
}

export function getSoundSettings(): SoundSettings {
  return typeof window === "undefined" ? DEFAULTS : read();
}

export function setSoundSettings(changes: Partial<SoundSettings>): void {
  current = { ...read(), ...changes };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Sem localStorage: vale só até fechar a aba.
  }
  for (const listener of listeners) listener();
}

export function subscribeSoundSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSoundSettings(): SoundSettings {
  return useSyncExternalStore(subscribeSoundSettings, getSoundSettings, () => DEFAULTS);
}
