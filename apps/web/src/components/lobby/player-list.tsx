"use client";

import { Crown, UserX, WifiOff } from "lucide-react";
import type { PublicPlayer } from "@chutai/shared";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

interface PlayerListProps {
  players: PublicPlayer[];
  maxPlayers: number;
  meId?: string;
  canKick: boolean;
  onKick: (playerId: string) => void;
}

/** Quem está na sala. O anfitrião pode expulsar. Vagas livres aparecem tracejadas. */
export function PlayerList({ players, maxPlayers, meId, canKick, onKick }: PlayerListProps) {
  const empty = Math.max(0, Math.min(maxPlayers, 12) - players.length);
  return (
    <section aria-label="Jogadores" className="flex flex-col gap-3">
      <h2 className="flex items-baseline gap-2 text-lg font-bold">
        Jogadores
        <span className="tabular text-sm font-semibold text-tinta-soft">
          {players.length} de {maxPlayers}
        </span>
      </h2>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {players.map((player) => (
          <li
            key={player.id}
            className={cn(
              "group relative flex animate-pop flex-col items-center gap-2 rounded-2xl border-2 border-tinta bg-white px-2 pt-4 pb-3 text-center",
              player.id === meId && "bg-gema-soft",
            )}
          >
            <Avatar emoji={player.avatar} size="lg" dimmed={!player.connected} />
            <span className="flex max-w-full items-center gap-1 text-sm font-semibold">
              <span className="truncate">{player.nickname}</span>
              {player.isHost ? (
                <Crown aria-label="Anfitrião" className="size-3.5 shrink-0 text-laranja" />
              ) : null}
            </span>
            <span className="text-xs text-tinta-soft">
              {!player.connected ? (
                <span className="inline-flex items-center gap-1">
                  <WifiOff aria-hidden className="size-3" /> reconectando
                </span>
              ) : player.id === meId ? (
                "você"
              ) : player.isHost ? (
                "anfitrião"
              ) : (
                "pronto"
              )}
            </span>
            {canKick && player.id !== meId ? (
              <button
                type="button"
                onClick={() => onKick(player.id)}
                aria-label={`Expulsar ${player.nickname}`}
                className="absolute top-1.5 right-1.5 rounded-lg p-1.5 text-tinta-soft opacity-100 transition-opacity hover:bg-pitanga/10 hover:text-pitanga sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
              >
                <UserX aria-hidden className="size-4" />
              </button>
            ) : null}
          </li>
        ))}
        {Array.from({ length: Math.min(empty, 3) }, (_, i) => (
          <li
            key={`vaga-${i}`}
            aria-hidden
            className={cn(
              "min-h-36 items-center justify-center rounded-2xl border-2 border-dashed border-linha text-sm text-tinta-soft",
              i === 0 ? "flex" : "hidden sm:flex",
            )}
          >
            vaga livre
          </li>
        ))}
      </ul>
    </section>
  );
}
