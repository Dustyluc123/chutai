"use client";

import { RotateCcw } from "lucide-react";
import type { RoomState } from "@chutai/shared";
import { Button } from "@/components/ui/button";
import type { UseRoom } from "@/hooks/useRoom";
import { Podium } from "./podium";
import { RoundReveal } from "./round-reveal";

/** Fim de jogo: pódio, último personagem revelado e "jogar de novo". */
export function FinalView({
  state,
  room,
  onLeave,
}: {
  state: RoomState;
  room: UseRoom;
  onLeave: () => void;
}) {
  const meId = room.session?.playerId;
  const standings = state.standings ?? [];
  const winner = standings[0];
  const iWon = winner?.playerId === meId;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm font-semibold text-tinta-soft">
          <span aria-hidden>{state.theme.emoji}</span> {state.theme.name}
        </p>
        <h1 className="font-display text-5xl sm:text-6xl">
          {iWon ? "Você ganhou!" : winner ? `${winner.nickname} ganhou!` : "Fim de jogo"}
        </h1>
      </div>

      <Podium standings={standings} meId={meId} />

      <div className="flex flex-col items-center gap-3">
        {room.isHost ? (
          <Button size="lg" onClick={() => void room.actions.restart()}>
            <RotateCcw aria-hidden className="size-5" /> Jogar de novo
          </Button>
        ) : (
          <p role="status" className="rounded-2xl bg-anil-soft px-4 py-3 text-sm font-semibold">
            Esperando o anfitrião decidir se tem revanche…
          </p>
        )}
        <Button variant="ghost" onClick={onLeave}>
          Sair da sala
        </Button>
      </div>

      {state.lastRound ? (
        <details className="group rounded-3xl">
          <summary className="cursor-pointer text-center text-sm font-semibold text-tinta-soft hover:text-tinta">
            Ver a última rodada
          </summary>
          <div className="mt-4">
            <RoundReveal
              summary={state.lastRound}
              players={state.players}
              totalRounds={state.settings.rounds}
              serverOffset={room.serverOffset}
              meId={meId}
            />
          </div>
        </details>
      ) : null}
    </div>
  );
}
