"use client";

import { useEffect, useRef } from "react";
import type { RoomState } from "@chutai/shared";
import { SoundDirector, type GameSnapshot, type SoundName } from "./director";
import { SoundEngine } from "./engine";
import { getSoundSettings, subscribeSoundSettings } from "./settings";

let engine: SoundEngine | undefined;

/** O motor de som da aba (criado só no navegador). */
function getEngine(): SoundEngine | undefined {
  if (typeof window === "undefined" || typeof AudioContext === "undefined") return undefined;
  engine ??= new SoundEngine({
    createContext: () => new AudioContext(),
    isHidden: () => document.visibilityState === "hidden",
    getSettings: getSoundSettings,
  });
  return engine;
}

export function playSound(name: SoundName): void {
  getEngine()?.play(name);
}

/** Desbloqueia o áudio na primeira interação e acompanha aba escondida e preferências. */
export function useSoundSetup(): void {
  useEffect(() => {
    const sound = getEngine();
    if (!sound) return;
    const unlock = () => sound.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    const onVisibility = () => sound.syncMusic();
    document.addEventListener("visibilitychange", onVisibility);
    const unsubscribe = subscribeSoundSettings(() => {
      // Mexer nas preferências é uma interação: pode desbloquear o áudio.
      sound.unlock();
      sound.syncMusic();
    });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("visibilitychange", onVisibility);
      unsubscribe();
    };
  }, []);
}

const secondsLeft = (endsAt: number | undefined, serverOffset: number) =>
  endsAt === undefined ? undefined : Math.ceil((endsAt - (Date.now() + serverOffset)) / 1000);

/** Retrato da sala para o diretor de som (só o que importa para os sons). */
export function roomSnapshot(
  state: RoomState,
  meId: string | undefined,
  serverOffset: number,
): GameSnapshot {
  const progress = state.round?.progress ?? [];
  return {
    phase: state.phase,
    roundNumber: state.round?.number ?? state.lastRound?.number ?? 0,
    countdownLeft:
      state.phase === "countdown" ? secondsLeft(state.countdownEndsAt, serverOffset) : undefined,
    intermissionLeft:
      state.phase === "intermission"
        ? secondsLeft(state.intermissionEndsAt, serverOffset)
        : undefined,
    roundLeft: state.phase === "round" ? secondsLeft(state.round?.endsAt, serverOffset) : undefined,
    othersSolved: progress.filter((p) => p.solved && p.playerId !== meId).length,
    myPosition: state.standings?.find((s) => s.playerId === meId)?.position,
  };
}

/** Toca os sons da partida (contagem, fim de rodada, pódio, alguém acertou...). */
export function useRoomSounds(
  state: RoomState | undefined,
  meId: string | undefined,
  serverOffset: number,
): void {
  const latest = useRef({ state, meId, serverOffset });
  latest.current = { state, meId, serverOffset };

  useEffect(() => {
    const director = new SoundDirector(playSound);
    const tick = () => {
      const { state: current, meId: me, serverOffset: offset } = latest.current;
      if (current) director.update(roomSnapshot(current, me, offset));
    };
    tick();
    const timer = setInterval(tick, 200);
    return () => clearInterval(timer);
  }, []);
}
