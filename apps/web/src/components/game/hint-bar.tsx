"use client";

import { Lightbulb } from "lucide-react";
import type { HintReveal, HintType } from "@chutai/shared";
import { HINTS, SCORING, canRequestHint } from "@chutai/game";
import { Button } from "@/components/ui/button";

interface HintBarProps {
  enabled: boolean;
  guessCount: number;
  hints: HintReveal[];
  solved: boolean;
  onRequest: (type: HintType) => void;
}

const LABELS: Record<HintType, string> = {
  attribute: "Revelar um atributo",
  firstLetter: "Primeira letra",
};

/** Dicas: liberadas depois de alguns chutes, cada uma custa pontos. */
export function HintBar({ enabled, guessCount, hints, solved, onRequest }: HintBarProps) {
  if (!enabled) return null;
  const locked = guessCount < HINTS.unlockAfterGuesses;
  const missing = HINTS.unlockAfterGuesses - guessCount;

  return (
    <section aria-label="Dicas" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <Lightbulb aria-hidden className="size-4" /> Dicas
        </span>
        {(["attribute", "firstLetter"] as const).map((type) => {
          const check = canRequestHint(type, {
            hintsEnabled: enabled,
            guesses: Array.from({ length: guessCount }) as never[],
            hintsUsed: hints,
            solved,
          });
          return (
            <Button
              key={type}
              size="sm"
              variant="secondary"
              disabled={!check.allowed}
              title={check.allowed ? undefined : check.reason}
              onClick={() => onRequest(type)}
            >
              {LABELS[type]}
              <span className="tabular text-xs text-tinta-soft">−{SCORING.perHint} pontos</span>
            </Button>
          );
        })}
        {solved ? null : locked ? (
          <span role="status" className="text-sm font-semibold text-tinta-soft">
            Dica liberada em {missing} {missing === 1 ? "chute" : "chutes"}.
          </span>
        ) : hints.length < HINTS.maxPerRound ? (
          <span role="status" className="text-sm font-semibold text-folha">
            Dicas liberadas! Até {HINTS.maxPerRound} por rodada.
          </span>
        ) : null}
      </div>
      {hints.length ? (
        <ul className="flex flex-wrap gap-2">
          {hints.map((hint) => (
            <li
              key={hint.type}
              className="animate-pop rounded-lg border-2 border-tinta bg-gema-soft px-3 py-1.5 text-sm font-semibold"
            >
              {hint.text}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
