"use client";

import type { CharacterReveal, GuessResult, HintReveal } from "@chutai/shared";

/**
 * Progresso do diário no navegador (sem banco por enquanto). Recarregar a página mantém os
 * chutes do dia; o número do dia separa um desafio do outro.
 */
export interface DailyProgress {
  day: number;
  guesses: GuessResult[];
  hints: HintReveal[];
  answer?: CharacterReveal;
  yesterday?: { name: string; emoji?: string; image?: string } | null;
}

export interface DailyStats {
  played: number;
  wins: number;
  streak: number;
  maxStreak: number;
  /** Último dia acertado (para a sequência). */
  lastWin?: number;
}

const progressKey = (slug: string) => `chutai:diario:${slug}`;
const statsKey = (slug: string) => `chutai:diario:${slug}:estatisticas`;

function read<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sem localStorage (navegação privada): vale só enquanto a página estiver aberta.
  }
}

/** Progresso de hoje (o de outro dia é descartado). */
export function loadProgress(slug: string, day: number): DailyProgress {
  const saved = read<DailyProgress>(progressKey(slug));
  return saved?.day === day ? saved : { day, guesses: [], hints: [] };
}

export function saveProgress(slug: string, progress: DailyProgress) {
  write(progressKey(slug), progress);
}

export const EMPTY_STATS: DailyStats = { played: 0, wins: 0, streak: 0, maxStreak: 0 };

/** Estatísticas, com a sequência zerada se a pessoa pulou um dia. */
export function loadStats(slug: string, today: number): DailyStats {
  const stats = { ...EMPTY_STATS, ...read<DailyStats>(statsKey(slug)) };
  if (stats.lastWin !== undefined && stats.lastWin < today - 1) stats.streak = 0;
  return stats;
}

/** Regra pura da sequência: acertar ontem e hoje soma; pular um dia recomeça do 1. */
export function statsAfterWin(stats: DailyStats, day: number): DailyStats {
  if (stats.lastWin === day) return stats;
  const streak = stats.lastWin === day - 1 ? stats.streak + 1 : 1;
  return {
    played: stats.played + 1,
    wins: stats.wins + 1,
    streak,
    maxStreak: Math.max(stats.maxStreak, streak),
    lastWin: day,
  };
}

export function recordWin(slug: string, day: number): DailyStats {
  const stats = statsAfterWin(loadStats(slug, day), day);
  write(statsKey(slug), stats);
  return stats;
}

/** Resumo para os cards de /diario: não jogou, jogando (N chutes) ou acertou (N chutes). */
export function dailyStatus(slug: string, day: number) {
  const progress = loadProgress(slug, day);
  return {
    guesses: progress.guesses.length,
    solved: progress.guesses.some((guess) => guess.correct),
    streak: loadStats(slug, day).streak,
  };
}
