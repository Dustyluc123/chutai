import { Crown } from "lucide-react";
import type { FinalStanding } from "@chutai/shared";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

const PLACES = [
  { position: 2, height: "h-28 sm:h-36", color: "bg-anil-soft", order: "order-1" },
  { position: 1, height: "h-40 sm:h-52", color: "bg-gema", order: "order-2" },
  { position: 3, height: "h-20 sm:h-24", color: "bg-chiclete-soft", order: "order-3" },
];

/** Pódio final: três primeiros em degraus, o resto em lista. */
export function Podium({ standings, meId }: { standings: FinalStanding[]; meId?: string }) {
  const top = standings.slice(0, 3);
  const rest = standings.slice(3);

  return (
    <div className="flex flex-col gap-8">
      <ol
        aria-label="Pódio"
        className="mx-auto flex w-full max-w-lg items-end justify-center gap-2 border-b-2 border-tinta sm:gap-4"
      >
        {PLACES.map((place, i) => {
          // Pega o i-ésimo colocado na ordem do pódio (2º, 1º, 3º).
          const standing = top[[1, 0, 2][i]!];
          if (!standing)
            return <li key={place.position} className={cn("w-24 sm:w-36", place.order)} />;
          const winner = standing.position === 1;
          return (
            <li
              key={standing.playerId}
              className={cn("flex w-24 flex-col items-center gap-2 sm:w-36", place.order)}
              style={{ animationDelay: `${(3 - place.position) * 150}ms` }}
            >
              {winner ? (
                <Crown aria-hidden className="size-7 text-laranja" strokeWidth={2.5} />
              ) : null}
              <Avatar emoji={standing.avatar} size={winner ? "xl" : "lg"} />
              <div className="flex flex-col items-center text-center">
                <span className="max-w-full truncate font-semibold">
                  {standing.nickname}
                  {standing.playerId === meId ? (
                    <span className="text-tinta-soft"> (você)</span>
                  ) : null}
                </span>
                <span className="tabular text-lg font-black">{standing.score}</span>
              </div>
              <div
                className={cn(
                  "flex w-full animate-pop items-start justify-center rounded-t-2xl border-2 border-b-0 border-tinta pt-3",
                  place.height,
                  place.color,
                )}
              >
                <span className="font-display text-4xl sm:text-5xl">{standing.position}º</span>
              </div>
            </li>
          );
        })}
      </ol>

      {rest.length ? (
        <ol className="mx-auto flex w-full max-w-md flex-col gap-1.5" start={4}>
          {rest.map((standing) => (
            <li
              key={standing.playerId}
              className="flex items-center gap-3 rounded-xl border-2 border-tinta bg-white px-3 py-2"
            >
              <span className="tabular w-7 text-center font-bold text-tinta-soft">
                {standing.position}º
              </span>
              <Avatar emoji={standing.avatar} size="sm" />
              <span className="flex-1 truncate font-semibold">{standing.nickname}</span>
              <span className="tabular font-black">{standing.score}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
