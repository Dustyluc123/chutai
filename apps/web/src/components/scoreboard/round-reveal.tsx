"use client";

import type { PublicPlayer, RoundSummary } from "@chutai/shared";
import { Avatar } from "@/components/ui/avatar";
import { CharacterPicture } from "@/components/ui/character-picture";
import { useCountdown } from "@/hooks/useCountdown";
import { cn } from "@/lib/cn";

interface RoundRevealProps {
  summary: RoundSummary;
  players: PublicPlayer[];
  totalRounds: number;
  nextAt?: number;
  /** Modo Misto: tipo da próxima rodada ("Próxima: Imagem"). */
  nextKind?: "classic" | "image";
  serverOffset: number;
  meId?: string;
}

/** Fim da rodada: revela o personagem e quanto cada um ganhou. */
export function RoundReveal({
  summary,
  players,
  totalRounds,
  nextAt,
  nextKind,
  serverOffset,
  meId,
}: RoundRevealProps) {
  const remaining = useCountdown(nextAt, serverOffset);
  const playerOf = (id: string) => players.find((player) => player.id === id);
  const isLast = summary.number >= totalRounds;

  return (
    <section
      aria-live="polite"
      className="animate-pop overflow-hidden rounded-3xl border-2 border-tinta bg-white shadow-carimbo"
    >
      <div className="flex flex-col gap-4 bg-anil px-5 py-6 text-white sm:flex-row sm:items-center sm:gap-6 sm:px-8">
        <CharacterPicture
          name={summary.character.name}
          image={summary.character.image}
          emoji={summary.character.emoji}
          size="xl"
          className="border-white"
        />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-white/75">
            Rodada {summary.number}: o personagem era
          </p>
          <h2 className="font-display text-4xl sm:text-5xl">{summary.character.name}</h2>
        </div>
      </div>

      <dl className="grid grid-cols-2 border-y-2 border-tinta bg-white sm:grid-cols-3">
        {summary.character.values.map((value) => (
          <div
            key={value.key}
            className="flex flex-col gap-0.5 px-5 py-3 shadow-[inset_-1px_-1px_0_var(--color-linha)]"
          >
            <dt className="text-xs font-semibold text-tinta-soft">{value.label}</dt>
            <dd className="text-sm font-semibold">{value.display}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-3 px-5 py-5 sm:px-8">
        <ol className="flex flex-col gap-1.5">
          {summary.results.map((result) => {
            const player = playerOf(result.playerId);
            if (!player) return null;
            return (
              <li
                key={result.playerId}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-2 py-1.5",
                  result.playerId === meId && "bg-gema-soft",
                )}
              >
                <Avatar emoji={player.avatar} size="sm" />
                <span className="flex-1 truncate font-semibold">{player.nickname}</span>
                <span className="text-sm text-tinta-soft">
                  {result.solved
                    ? `${result.guesses} ${result.guesses === 1 ? "chute" : "chutes"}${result.hintsUsed ? `, ${result.hintsUsed} dica${result.hintsUsed > 1 ? "s" : ""}` : ""}`
                    : "não acertou"}
                </span>
                <span
                  className={cn(
                    "tabular w-16 text-right font-black",
                    result.points > 0 ? "text-folha" : "text-tinta-soft",
                  )}
                >
                  +{result.points}
                </span>
              </li>
            );
          })}
        </ol>
        {nextAt ? (
          <p className="text-sm font-semibold text-tinta-soft">
            {isLast
              ? "Resultado final em"
              : nextKind
                ? `Próxima: ${nextKind === "image" ? "Imagem" : "Clássica"}, em`
                : "Próxima rodada em"}{" "}
            <span className="tabular text-tinta">{Math.ceil(remaining / 1000)}s</span>
          </p>
        ) : null}
      </div>
    </section>
  );
}
