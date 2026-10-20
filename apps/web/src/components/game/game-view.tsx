"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PartyPopper } from "lucide-react";
import type { RoomState } from "@chutai/shared";
import type { UseRoom } from "@/hooks/useRoom";
import { LiveScoreboard } from "@/components/scoreboard/live-scoreboard";
import { RoundReveal } from "@/components/scoreboard/round-reveal";
import { GuessBoard } from "./guess-board";
import { GuessInput } from "./guess-input";
import { GuessList } from "./guess-list";
import { MysteryImage } from "./mystery-image";
import { HintBar } from "./hint-bar";
import { Legend } from "./legend";
import { RoundTimer } from "./round-timer";

interface GameViewProps {
  state: RoomState;
  room: UseRoom;
}

/** Tela da partida: cronômetro, campo de palpite, tabuleiro e placar ao vivo. */
export function GameView({ state, room }: GameViewProps) {
  const options = room.characters;
  const me = room.me;
  const meId = room.session?.playerId;
  const guesses = useMemo(() => me?.guesses ?? [], [me?.guesses]);
  const guessedIds = useMemo(() => new Set(guesses.map((guess) => guess.characterId)), [guesses]);
  const roundNumber = state.round?.number ?? state.lastRound?.number ?? 1;

  // Anima só a fileira que acabou de chegar, não as antigas ao reconectar.
  const [animateLatest, setAnimateLatest] = useState(false);
  const lastCount = useRef(guesses.length);
  useEffect(() => {
    setAnimateLatest(guesses.length > lastCount.current);
    lastCount.current = guesses.length;
  }, [guesses.length]);

  const inRound = state.phase === "round" && state.round;
  const solved = me?.solved ?? false;
  const imageMode = state.settings.mode === "image";

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b-2 border-tinta bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-6 sm:px-6">
          <div className="flex shrink-0 items-center gap-3">
            <p className="font-display text-2xl">
              Rodada {roundNumber}
              <span className="text-tinta-soft"> / {state.settings.rounds}</span>
            </p>
            {imageMode && state.theme.imageMode === "partial" ? (
              <span
                title={`Só os ${state.theme.imageCharacterCount} personagens com imagem estão nesta partida.`}
                className="rounded-full border-2 border-tinta bg-gema-soft px-2.5 py-0.5 text-xs font-bold"
              >
                Imagem parcial
              </span>
            ) : null}
          </div>
          <div className="flex-1">
            {inRound ? (
              <RoundTimer
                startedAt={state.round!.startedAt}
                endsAt={state.round!.endsAt}
                serverOffset={room.serverOffset}
              />
            ) : (
              <p className="text-sm font-semibold text-tinta-soft">Rodada encerrada</p>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="flex min-w-0 flex-col gap-5">
          {state.phase === "intermission" && state.lastRound ? (
            <RoundReveal
              summary={state.lastRound}
              players={state.players}
              totalRounds={state.settings.rounds}
              nextAt={state.intermissionEndsAt}
              serverOffset={room.serverOffset}
              meId={meId}
            />
          ) : null}

          {inRound && imageMode ? (
            <MysteryImage
              url={room.roundImage?.url ?? null}
              level={room.roundImage?.level ?? me?.image?.level ?? 0}
              maxLevel={room.roundImage?.maxLevel ?? me?.image?.maxLevel ?? 4}
              status={me?.image?.status ?? "loading"}
              className="self-center"
            />
          ) : null}

          {inRound ? (
            solved ? (
              <div
                role="status"
                className="flex animate-pop items-center gap-3 rounded-2xl border-2 border-folha bg-folha-soft px-4 py-3.5 font-semibold"
              >
                <PartyPopper aria-hidden className="size-6 text-folha" />
                Você acertou! Esperando os outros ou o tempo acabar.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <GuessInput
                  options={options}
                  guessedIds={guessedIds}
                  showPictures={!imageMode}
                  autoFocus
                  onGuess={async (id) => {
                    await room.actions.guess(id);
                  }}
                />
                <HintBar
                  enabled={state.settings.hintsEnabled}
                  guessCount={guesses.length}
                  hints={me?.hints ?? []}
                  solved={solved}
                  onRequest={(type) => void room.actions.hint(type)}
                />
              </div>
            )
          ) : null}

          {imageMode ? (
            state.phase === "round" || guesses.length ? (
              <GuessList
                guesses={guesses}
                showPictures={false}
                emptyMessage="Quem é? Chute pelo nome. Cada erro deixa a imagem um pouco mais nítida."
              />
            ) : null
          ) : state.phase === "round" || guesses.length ? (
            <GuessBoard
              attributes={state.theme.attributes}
              guesses={guesses}
              animateLatest={animateLatest}
              emptyMessage="Chute um personagem. Cada coluna mostra se aquele atributo bate com o personagem secreto."
            />
          ) : null}

          {inRound && !imageMode ? <Legend className="pt-1" /> : null}
        </div>

        <aside>
          <LiveScoreboard
            players={state.players}
            progress={state.round?.progress}
            attributeCount={state.round?.attributeCount}
            imageLevels={imageMode ? (me?.image?.maxLevel ?? 4) + 1 : undefined}
            meId={meId}
          />
        </aside>
      </div>
    </div>
  );
}
