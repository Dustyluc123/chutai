"use client";

import Link from "next/link";
import { Check, Flame } from "lucide-react";
import { useEffect, useState } from "react";
import type { ThemeColor } from "@chutai/shared";
import { dailyStatus } from "@/lib/daily/storage";
import { THEME_COLORS } from "@/lib/colors";
import { cn } from "@/lib/cn";

interface CardTheme {
  slug: string;
  name: string;
  emoji: string;
  color: ThemeColor;
  characterCount: number;
  /** Tema novo: dia (AAAA-MM-DD) em que o diário começa. */
  startsOn?: string | null;
}

type Status = ReturnType<typeof dailyStatus>;

/** Um card por tema, com o estado de hoje (lido do navegador). */
export function DailyCards({ themes, day }: { themes: CardTheme[]; day: number }) {
  const [status, setStatus] = useState<Record<string, Status>>({});
  useEffect(() => {
    setStatus(
      Object.fromEntries(themes.map((theme) => [theme.slug, dailyStatus(theme.slug, day)])),
    );
  }, [themes, day]);

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {themes.map((theme) => {
        const colors = THEME_COLORS[theme.color];
        const s = status[theme.slug];
        return (
          <li key={theme.slug}>
            <Link
              href={`/diario/${theme.slug}`}
              className={cn(
                "flex h-full flex-col gap-3 rounded-3xl border-2 border-tinta p-5 shadow-carimbo transition-transform hover:-translate-y-0.5",
                colors.bg,
                colors.text,
              )}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="font-display text-2xl leading-tight">{theme.name}</span>
                <span aria-hidden className="text-4xl leading-none">
                  {theme.emoji}
                </span>
              </span>
              <span className="mt-auto flex flex-wrap items-center gap-2 text-sm font-semibold">
                {theme.startsOn ? (
                  <span className="rounded-full border-2 border-tinta bg-white px-2.5 py-0.5 text-tinta">
                    Começa em {theme.startsOn.split("-").reverse().join("/")}
                  </span>
                ) : s?.solved ? (
                  <span className="inline-flex items-center gap-1 rounded-full border-2 border-tinta bg-folha px-2.5 py-0.5 text-white">
                    <Check aria-hidden className="size-4" strokeWidth={3} /> Acertou em {s.guesses}{" "}
                    {s.guesses === 1 ? "chute" : "chutes"}
                  </span>
                ) : s?.guesses ? (
                  <span className="rounded-full border-2 border-tinta bg-white px-2.5 py-0.5 text-tinta">
                    Jogando: {s.guesses} {s.guesses === 1 ? "chute" : "chutes"}
                  </span>
                ) : (
                  <span className="rounded-full border-2 border-tinta bg-white px-2.5 py-0.5 text-tinta">
                    Jogar
                  </span>
                )}
                {s && s.streak > 1 ? (
                  <span className="inline-flex items-center gap-1">
                    <Flame aria-hidden className="size-4" /> {s.streak} dias seguidos
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
