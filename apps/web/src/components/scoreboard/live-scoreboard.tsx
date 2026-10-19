import { Check, Crown, WifiOff } from "lucide-react";
import type { PlayerProgress, PublicPlayer } from "@chutai/shared";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

interface LiveScoreboardProps {
  players: PublicPlayer[];
  progress?: PlayerProgress[];
  attributeCount?: number;
  meId?: string;
  className?: string;
}

/**
 * Placar ao vivo. Mostra quanto cada um avançou sem entregar nada:
 * número de chutes e quantos atributos verdes já conseguiu num palpite.
 */
export function LiveScoreboard({
  players,
  progress,
  attributeCount = 0,
  meId,
  className,
}: LiveScoreboardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const progressOf = (id: string) => progress?.find((item) => item.playerId === id);

  return (
    <section aria-label="Placar" className={cn("flex flex-col gap-2", className)}>
      <h2 className="text-sm font-semibold text-tinta-soft">Placar</h2>
      <ol className="flex flex-col gap-2">
        {sorted.map((player, index) => {
          const p = progressOf(player.id);
          const isMe = player.id === meId;
          return (
            <li
              key={player.id}
              className={cn(
                "flex items-center gap-3 rounded-2xl border-2 bg-white px-3 py-2.5 transition-colors",
                p?.solved ? "border-folha" : "border-tinta",
                isMe && "ring-2 ring-gema ring-offset-2 ring-offset-papel",
              )}
            >
              <span className="tabular w-5 text-center text-sm font-bold text-tinta-soft">
                {index + 1}
              </span>
              <Avatar emoji={player.avatar} size="sm" dimmed={!player.connected} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-center gap-1.5 truncate text-sm font-semibold">
                  <span className="truncate">{player.nickname}</span>
                  {isMe ? (
                    <span className="text-xs font-medium text-tinta-soft">(você)</span>
                  ) : null}
                  {player.isHost ? (
                    <Crown aria-label="Anfitrião" className="size-3.5 shrink-0 text-laranja" />
                  ) : null}
                  {!player.connected ? (
                    <WifiOff
                      aria-label="Desconectado"
                      className="size-3.5 shrink-0 text-tinta-soft"
                    />
                  ) : null}
                </span>
                {p && attributeCount > 0 ? (
                  <span className="flex items-center gap-2 text-xs whitespace-nowrap text-tinta-soft">
                    <span
                      aria-label={`${p.bestMatch} de ${attributeCount} atributos certos no melhor palpite`}
                      className="flex gap-0.5"
                    >
                      {Array.from({ length: attributeCount }, (_, i) => (
                        <span
                          key={i}
                          className={cn(
                            "h-2 w-2.5 rounded-[3px] border border-tinta/40",
                            p.solved || i < p.bestMatch ? "border-folha bg-folha" : "bg-papel",
                          )}
                        />
                      ))}
                    </span>
                    <span className="tabular">
                      {p.guessCount} {p.guessCount === 1 ? "chute" : "chutes"}
                    </span>
                    {p.solved ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-folha px-1.5 py-px font-bold text-white">
                        <Check aria-hidden className="size-3" strokeWidth={3} />
                        {p.solveRank}º
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </div>
              <span className="tabular text-base font-black">{player.score}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
