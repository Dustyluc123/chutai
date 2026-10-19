"use client";

import { Play } from "lucide-react";
import type { RoomState } from "@chutai/shared";
import { Button } from "@/components/ui/button";
import type { UseRoom } from "@/hooks/useRoom";
import { PlayerList } from "./player-list";
import { RoomCodeCard } from "./room-code-card";
import { SettingsPanel } from "./settings-panel";

interface LobbyViewProps {
  state: RoomState;
  room: UseRoom;
}

/** Sala de espera: código para convidar, quem está na sala e as regras. */
export function LobbyView({ state, room }: LobbyViewProps) {
  const meId = room.session?.playerId;
  const connectedCount = state.players.filter((player) => player.connected).length;
  const host = state.players.find((player) => player.isHost);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1.5fr_1fr] lg:py-10">
      <div className="flex flex-col gap-6">
        <RoomCodeCard code={state.code} />
        <PlayerList
          players={state.players}
          maxPlayers={state.settings.maxPlayers}
          meId={meId}
          canKick={room.isHost}
          onKick={(id) => void room.actions.kick(id)}
        />
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <SettingsPanel
          settings={state.settings}
          editable={room.isHost}
          onChange={(changes) => void room.actions.updateSettings(changes)}
        />
        {room.isHost ? (
          <div className="flex flex-col gap-2">
            <Button size="lg" onClick={() => void room.actions.start()}>
              <Play aria-hidden className="size-5" fill="currentColor" /> Começar partida
            </Button>
            {connectedCount < 2 ? (
              <p className="text-center text-sm text-tinta-soft">
                Dá para começar sozinho para testar, mas é melhor com mais gente.
              </p>
            ) : null}
          </div>
        ) : (
          <p
            role="status"
            className="rounded-2xl bg-anil-soft px-4 py-3 text-center text-sm font-semibold"
          >
            Esperando {host?.nickname ?? "o anfitrião"} começar a partida…
          </p>
        )}
      </div>
    </div>
  );
}
