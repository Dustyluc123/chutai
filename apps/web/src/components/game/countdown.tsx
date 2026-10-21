"use client";

import { useEffect, useState } from "react";
import { useCountdown } from "@/hooks/useCountdown";

/**
 * Número grande da contagem (5, 4, 3, 2, 1 e depois "Vai!"), em fundo anil.
 * O horário de término vem do servidor; aqui só desenhamos.
 * Com `prefers-reduced-motion`, a animação some (regra global em globals.css) e ficam só os números.
 */
function CountdownNumber({ value, label }: { value: string; label: string }) {
  return (
    <>
      <span
        key={value}
        aria-hidden
        className="font-display block text-[9rem] leading-none text-white drop-shadow-[6px_6px_0_var(--color-tinta)] motion-safe:animate-count sm:text-[14rem]"
      >
        {value}
      </span>
      {/* Leitores de tela: uma frase por número, sem repetir o mesmo valor. */}
      <span aria-live="assertive" className="sr-only">
        {label}
      </span>
    </>
  );
}

function useSecondsLeft(endsAt: number | undefined, serverOffset: number): number {
  return Math.ceil(useCountdown(endsAt, serverOffset) / 1000);
}

/** Tela da fase `countdown`: todo mundo vê 5, 4, 3, 2, 1, Vai! antes da primeira rodada. */
export function StartCountdown({
  endsAt,
  serverOffset,
  themeName,
  themeEmoji,
  mixed,
}: {
  endsAt: number;
  serverOffset: number;
  themeName: string;
  themeEmoji: string;
  /** Modo Misto: avisa que a primeira rodada é Clássica. */
  mixed?: boolean;
}) {
  const seconds = useSecondsLeft(endsAt, serverOffset);
  const go = seconds <= 0;
  return (
    <section
      aria-label="Contagem para começar a partida"
      className="flex flex-1 flex-col items-center justify-center gap-6 bg-anil px-4 py-12 text-center"
    >
      <p className="rounded-full border-2 border-tinta bg-gema px-4 py-1.5 font-semibold shadow-carimbo-sm">
        <span aria-hidden>{themeEmoji}</span> {themeName}
      </p>
      <CountdownNumber
        value={go ? "Vai!" : String(seconds)}
        label={go ? "Vai!" : `A partida começa em ${seconds}`}
      />
      <p className="font-semibold text-white/85">
        {mixed
          ? "Modo Misto: começa com uma rodada Clássica, depois uma de Imagem."
          : "Prepare o dedo: o primeiro personagem vem aí."}
      </p>
    </section>
  );
}

/**
 * Últimos segundos do intervalo entre rodadas: 3, 2, 1 por cima da revelação.
 * Usa o mesmo horário de término do intervalo, então o tempo total não aumenta.
 */
export function BetweenRoundsCountdown({
  endsAt,
  serverOffset,
  from,
  nextRound,
  nextKind,
}: {
  endsAt: number | undefined;
  serverOffset: number;
  from: number;
  nextRound: number;
  /** Modo Misto: tipo da próxima rodada. */
  nextKind?: "classic" | "image";
}) {
  const kindLabel = nextKind ? (nextKind === "image" ? " · Imagem" : " · Clássica") : "";
  const seconds = useSecondsLeft(endsAt, serverOffset);
  if (!endsAt || seconds <= 0 || seconds > from) return null;
  return (
    <div
      role="dialog"
      aria-label={`Rodada ${nextRound} vai começar`}
      className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-anil/95 px-4 text-center"
    >
      <p className="font-display text-2xl text-gema sm:text-3xl">
        Rodada {nextRound}
        {kindLabel}
      </p>
      <CountdownNumber value={String(seconds)} label={`Rodada ${nextRound} em ${seconds}`} />
    </div>
  );
}

/**
 * "Vai!" rápido no começo da rodada. Não bloqueia nada (pointer-events-none):
 * o cronômetro já está andando e o campo de palpite já funciona por baixo.
 */
export function GoFlash({
  roundNumber,
  startedAt,
  serverOffset,
}: {
  roundNumber: number;
  startedAt: number;
  serverOffset: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    // Só mostra quando a rodada acabou de começar (não ao reconectar no meio dela).
    const age = Date.now() + serverOffset - startedAt;
    if (age > 1500) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 900);
    return () => clearTimeout(timer);
  }, [roundNumber, startedAt, serverOffset]);

  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
      <span
        aria-hidden
        className="font-display rounded-[2rem] border-4 border-tinta bg-gema px-10 py-4 text-7xl shadow-carimbo motion-safe:animate-go sm:text-9xl"
      >
        Vai!
      </span>
      <span className="sr-only" aria-live="assertive">
        Vai!
      </span>
    </div>
  );
}
