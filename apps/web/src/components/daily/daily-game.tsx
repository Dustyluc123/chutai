"use client";

import { CalendarDays, Copy, Flame, PartyPopper, Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CharacterOption, DailyRequest, DailyResponse, HintType } from "@chutai/shared";
import { msUntilNextDaily } from "@chutai/game";
import { GuessBoard } from "@/components/game/guess-board";
import { GuessInput } from "@/components/game/guess-input";
import { HintBar } from "@/components/game/hint-bar";
import { HowToPlayButton } from "@/components/help/how-to-play";
import { Button } from "@/components/ui/button";
import { CharacterPicture } from "@/components/ui/character-picture";
import { useToast } from "@/components/ui/toaster";
import { dailyShareText } from "@/lib/daily/share";
import {
  EMPTY_STATS,
  loadProgress,
  loadStats,
  recordWin,
  saveProgress,
  type DailyProgress,
  type DailyStats,
} from "@/lib/daily/storage";
import { playSound } from "@/lib/sound";
import { guessSound } from "@/lib/sound/director";
import { SITE_URL } from "@/lib/site";

interface DailyGameProps {
  slug: string;
  themeName: string;
  themeEmoji: string;
  attributes: { key: string; label: string }[];
  options: CharacterOption[];
  /** Número do desafio de hoje (Chutaí #N), calculado no servidor. */
  day: number;
}

/** O pedido sem o número do dia (que o componente completa). */
type Body = DailyRequest extends infer T
  ? T extends DailyRequest
    ? Omit<T, "day">
    : never
  : never;

/** "3:04:59" até a meia-noite de Brasília. */
function useTimeToNext(): string {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setMs(msUntilNextDaily(new Date()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  if (ms === null) return "";
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Desafio diário: sozinho, sem tempo e sem limite de chutes. Os chutes vão para a rota
 * /api/diario/[slug], que sabe a resposta; o navegador só guarda o próprio progresso.
 */
export function DailyGame({
  slug,
  themeName,
  themeEmoji,
  attributes,
  options,
  day,
}: DailyGameProps) {
  const toast = useToast();
  const [progress, setProgress] = useState<DailyProgress>({ day, guesses: [], hints: [] });
  const [stats, setStats] = useState<DailyStats>(EMPTY_STATS);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const timeToNext = useTimeToNext();

  // Lê o progresso só no navegador (evita diferença entre servidor e cliente na hidratação).
  useEffect(() => {
    setProgress(loadProgress(slug, day));
    setStats(loadStats(slug, day));
    setLoaded(true);
    setCanNativeShare(
      typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches,
    );
  }, [slug, day]);

  const update = (next: DailyProgress) => {
    setProgress(next);
    saveProgress(slug, next);
  };

  const guessedIds = useMemo(
    () => new Set(progress.guesses.map((guess) => guess.characterId)),
    [progress.guesses],
  );
  const solved = progress.guesses.some((guess) => guess.correct);

  async function send(body: Body): Promise<DailyResponse | null> {
    setBusy(true);
    try {
      const response = await fetch(`/api/diario/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, day }),
      });
      const data = (await response.json()) as DailyResponse;
      if (!data.ok) {
        toast(data.error, "error");
        // Virou o dia com a página aberta: carrega o desafio novo.
        if (data.today && data.today !== day) setTimeout(() => window.location.reload(), 1500);
        return null;
      }
      return data;
    } catch {
      toast("Não deu para falar com o servidor. Tente de novo.", "error");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function guess(characterId: string) {
    const data = await send({ action: "guess", characterId });
    if (!data?.ok || !data.guess) return;
    const result = { ...data.guess, guessNumber: progress.guesses.length + 1 };
    playSound(guessSound(result.correct));
    const next: DailyProgress = { ...progress, guesses: [...progress.guesses, result] };
    if (result.correct) {
      next.answer = data.answer;
      next.yesterday = data.yesterday ?? null;
      setStats(recordWin(slug, day));
    }
    update(next);
  }

  async function hint(type: HintType) {
    const data = await send({
      action: "hint",
      type,
      guesses: progress.guesses.map((item) => item.characterId),
      hintsUsed: progress.hints.map((item) => item.type),
    });
    if (data?.ok && data.hint) update({ ...progress, hints: [...progress.hints, data.hint] });
  }

  const shareText = dailyShareText({
    number: day,
    themeName,
    guesses: progress.guesses,
    hintsUsed: progress.hints.length,
    url: `${SITE_URL}/diario`,
  });

  async function share() {
    try {
      await navigator.share({ text: shareText });
    } catch {
      // Cancelou: nada a fazer.
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareText);
      toast("Resultado copiado. Manda no grupo!", "success");
    } catch {
      toast("Não deu para copiar.", "error");
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-tinta-soft">
            <CalendarDays aria-hidden className="size-4" /> Desafio do dia · Chutaí #{day}
          </p>
          <h1 className="font-display text-4xl sm:text-5xl">
            <span aria-hidden>{themeEmoji}</span> {themeName}
          </h1>
          <p className="text-sm text-tinta-soft">
            Um personagem por dia, o mesmo para todo mundo. Sem tempo e sem limite de chutes.
          </p>
        </div>
        <HowToPlayButton initialTab="classic" className="h-11 px-4" />
      </div>

      {solved && progress.answer ? (
        <section
          aria-live="polite"
          className="flex animate-pop flex-col gap-4 rounded-3xl border-2 border-folha bg-folha-soft p-5 sm:flex-row sm:items-center sm:gap-5"
        >
          <CharacterPicture
            name={progress.answer.name}
            image={progress.answer.image}
            emoji={progress.answer.emoji}
            size="xl"
          />
          <div className="flex flex-1 flex-col gap-1">
            <p className="flex items-center gap-2 font-semibold">
              <PartyPopper aria-hidden className="size-5 text-folha" /> Acertou em{" "}
              {progress.guesses.length} {progress.guesses.length === 1 ? "chute" : "chutes"}!
            </p>
            <p className="font-display text-3xl">{progress.answer.name}</p>
            <p className="text-sm text-tinta-soft">
              Próximo desafio em <span className="tabular font-bold text-tinta">{timeToNext}</span>
              {stats.streak > 1 ? (
                <>
                  {" · "}
                  <Flame aria-hidden className="inline size-4 text-laranja" /> {stats.streak} dias
                  seguidos
                </>
              ) : null}
            </p>
            {progress.yesterday ? (
              <p className="text-sm text-tinta-soft">
                Ontem era:{" "}
                <span className="font-semibold text-tinta">{progress.yesterday.name}</span>
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {canNativeShare ? (
              <Button onClick={() => void share()}>
                <Share2 aria-hidden className="size-5" /> Compartilhar
              </Button>
            ) : null}
            <Button variant={canNativeShare ? "secondary" : "primary"} onClick={() => void copy()}>
              <Copy aria-hidden className="size-5" /> Copiar resultado
            </Button>
          </div>
        </section>
      ) : loaded ? (
        <div className="flex flex-col gap-3">
          <GuessInput
            options={options}
            guessedIds={guessedIds}
            onGuess={guess}
            disabled={busy}
            autoFocus
          />
          <HintBar
            enabled
            scoreless
            guessCount={progress.guesses.length}
            hints={progress.hints}
            solved={solved}
            onRequest={(type) => void hint(type)}
          />
        </div>
      ) : null}

      {solved && progress.hints.length ? (
        <ul className="flex flex-wrap gap-2">
          {progress.hints.map((item) => (
            <li
              key={item.type}
              className="rounded-lg border-2 border-tinta bg-gema-soft px-3 py-1.5 text-sm font-semibold"
            >
              {item.text}
            </li>
          ))}
        </ul>
      ) : null}

      <GuessBoard
        attributes={attributes}
        guesses={progress.guesses}
        animateLatest
        emptyMessage="Chute qualquer personagem. As cores mostram o quanto você chegou perto."
      />
    </>
  );
}
