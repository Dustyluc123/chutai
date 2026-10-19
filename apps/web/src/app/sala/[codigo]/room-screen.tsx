"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useRoom } from "@/hooks/useRoom";
import { RoomTopBar } from "@/components/layout/room-top-bar";
import { JoinCard } from "@/components/lobby/join-card";
import { LobbyView } from "@/components/lobby/lobby-view";
import { GameView } from "@/components/game/game-view";
import { FinalView } from "@/components/scoreboard/final-view";
import { Button } from "@/components/ui/button";

/** Escolhe o que mostrar na sala conforme a fase: entrar, lobby, partida ou pódio. */
export function RoomScreen({ code }: { code: string }) {
  const router = useRouter();
  const room = useRoom(code);
  const { status, state } = room;

  const leave = () => {
    room.actions.leave();
    router.push("/");
  };

  // Título da aba acompanha a partida (ajuda quem joga com várias abas abertas).
  useEffect(() => {
    if (!state) return;
    const phase =
      state.phase === "lobby"
        ? "Lobby"
        : state.phase === "finished"
          ? "Fim de jogo"
          : `Rodada ${state.round?.number ?? state.lastRound?.number}`;
    document.title = `${phase} · Sala ${code} · Chutaí`;
  }, [state, code]);

  if (status === "joined" && state) {
    return (
      <div className="flex min-h-dvh flex-col">
        <RoomTopBar
          code={code}
          themeName={state.theme.name}
          themeEmoji={state.theme.emoji}
          connected={room.connected}
          onLeave={leave}
        />
        <main id="conteudo" className="flex flex-1 flex-col">
          {state.phase === "lobby" ? <LobbyView state={state} room={room} /> : null}
          {state.phase === "round" || state.phase === "intermission" ? (
            <GameView state={state} room={room} />
          ) : null}
          {state.phase === "finished" ? (
            <FinalView state={state} room={room} onLeave={leave} />
          ) : null}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-anil">
      <RoomTopBar code={code} connected={status !== "offline"} />
      <main id="conteudo" className="flex flex-1 items-center justify-center px-4 py-10">
        {status === "connecting" || (status === "joined" && !state) ? (
          <div role="status" className="flex flex-col items-center gap-4 text-white">
            <span
              aria-hidden
              className="size-10 animate-spin rounded-full border-4 border-white/30 border-t-gema"
            />
            <p className="font-semibold">Entrando na sala {code}…</p>
          </div>
        ) : null}

        {status === "needs-profile" ? (
          <JoinCard
            code={code}
            initialProfile={room.profile}
            serverError={room.error}
            onJoin={room.enter}
          />
        ) : null}

        {status === "not-found" ? (
          <Message
            title="Essa sala não existe mais"
            text="Talvez o código esteja errado ou a partida já acabou e todo mundo saiu. Peça um código novo ou crie sua própria sala."
          />
        ) : null}

        {status === "kicked" ? (
          <Message
            title="Você saiu da sala"
            text="O anfitrião tirou você desta partida. Você pode criar outra sala."
          />
        ) : null}

        {status === "offline" ? (
          <Message
            title="Servidor do jogo fora do ar"
            text={room.error ?? "Não foi possível conectar. Tente de novo em instantes."}
            action={
              <Button variant="secondary" onClick={() => window.location.reload()}>
                Tentar de novo
              </Button>
            }
          />
        ) : null}
      </main>
    </div>
  );
}

function Message({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex w-full max-w-md flex-col gap-4 rounded-3xl border-2 border-tinta bg-white p-6 shadow-carimbo sm:p-8">
      <h1 className="font-display text-3xl">{title}</h1>
      <p className="text-tinta-soft">{text}</p>
      <div className="flex flex-wrap gap-2">
        {action}
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-xl border-2 border-tinta bg-gema px-5 font-semibold shadow-carimbo-sm"
        >
          Criar uma sala
        </Link>
      </div>
    </div>
  );
}
