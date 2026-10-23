"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CharacterOption,
  HintType,
  JoinedRoom,
  PrivateState,
  RoomSettings,
  RoomState,
  RoundImage,
} from "@chutai/shared";
import { getSocket, unwrap, waitForConnection } from "@/lib/socket";
import {
  clearRoomSession,
  loadProfile,
  loadRoomSession,
  saveProfile,
  saveRoomSession,
  type Profile,
} from "@/lib/identity";
import { useToast } from "@/components/ui/toaster";
import { solvedToastText, type SolvedNotice } from "@/lib/solved-toast";

export type RoomStatus =
  | "connecting" // abrindo conexão / tentando voltar para a sala
  | "needs-profile" // chegou pelo link: precisa escolher apelido
  | "joined"
  | "not-found"
  | "kicked"
  | "offline"; // servidor fora do ar

/** Imagem secreta do modo Imagem, já no nível que este jogador alcançou. */
export interface MysteryImageState {
  round: number;
  level: number;
  maxLevel: number;
  /** URL local (blob:) criada a partir dos bytes recebidos; não diz nada sobre o personagem. */
  url: string;
}

/**
 * Num deploy do servidor, a sala leva alguns segundos para mudar de um servidor para o outro
 * ("mudando de servidor"). Nesse caso tenta de novo em vez de dizer que a sala não existe.
 */
async function rejoinWithRetry<T>(attempt: () => Promise<T>, retries = 5): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await attempt();
    } catch (err) {
      if (i >= retries || !(err as Error).message.includes("mudando de servidor")) throw err;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

/**
 * Toda a conversa com o servidor de tempo real para uma sala.
 * O componente só lê `state`/`me` e chama as ações; o servidor decide o resto.
 */
export function useRoom(code: string) {
  const toast = useToast();
  const [status, setStatus] = useState<RoomStatus>("connecting");
  const [state, setState] = useState<RoomState | null>(null);
  const [me, setMe] = useState<PrivateState | null>(null);
  const [session, setSession] = useState<JoinedRoom | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);
  const [serverOffset, setServerOffset] = useState(0);
  const [roundImage, setRoundImage] = useState<MysteryImageState | null>(null);
  const [characters, setCharacters] = useState<CharacterOption[]>([]);
  const imageUrlRef = useRef<string | null>(null);
  const sessionRef = useRef<JoinedRoom | null>(null);
  const profileRef = useRef<Profile | null>(null);

  const join = useCallback(
    async (chosen: Profile, token?: string) => {
      const socket = getSocket();
      await waitForConnection(socket);
      const joined = unwrap(
        await socket.emitWithAck("room:join", {
          code,
          nickname: chosen.nickname,
          avatar: chosen.avatar,
          token,
        }),
      );
      saveProfile(chosen);
      saveRoomSession(joined);
      profileRef.current = chosen;
      sessionRef.current = joined;
      setProfile(chosen);
      setSession(joined);
      setStatus("joined");
      return joined;
    },
    [code],
  );

  // Conexão, eventos e tentativa automática de voltar para a sala.
  useEffect(() => {
    const socket = getSocket();
    const saved = loadRoomSession(code);
    const savedProfile = loadProfile();
    profileRef.current = savedProfile;
    setProfile(savedProfile);

    const onState = (next: RoomState) => {
      setServerOffset(next.serverNow - Date.now());
      setState(next);
    };
    const onPrivate = (next: PrivateState) => setMe(next);
    let solvedBatch: SolvedNotice[] = [];
    let solvedTimer: ReturnType<typeof setTimeout> | undefined;
    const onImage = (image: RoundImage) => {
      const url = URL.createObjectURL(new Blob([image.data as BlobPart], { type: image.mimeType }));
      if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
      imageUrlRef.current = url;
      setRoundImage({ round: image.round, level: image.level, maxLevel: image.maxLevel, url });
    };
    const onSolved = ({
      playerId,
      nickname,
      rank,
    }: {
      playerId: string;
      nickname: string;
      rank: number;
    }) => {
      if (playerId === sessionRef.current?.playerId) return;
      // Acertos quase ao mesmo tempo viram um aviso só (sala cheia não vira pilha de avisos).
      solvedBatch.push({ nickname, rank });
      solvedTimer ??= setTimeout(() => {
        toast(solvedToastText(solvedBatch), "success");
        solvedBatch = [];
        solvedTimer = undefined;
      }, 1200);
    };
    const onKicked = () => {
      clearRoomSession(code);
      sessionRef.current = null;
      setStatus("kicked");
    };
    const onConnect = () => {
      setConnected(true);
      // Reconectou (queda de internet, servidor reiniciou): volta para a mesma sala.
      const current = sessionRef.current;
      const who = profileRef.current;
      if (current && who) {
        void rejoinWithRetry(() => join(who, current.token)).catch(() => setStatus("not-found"));
      }
    };
    const onDisconnect = () => setConnected(false);

    socket.on("room:state", onState);
    socket.on("you:state", onPrivate);
    socket.on("round:image", onImage);
    socket.on("room:characters", setCharacters);
    socket.on("player:solved", onSolved);
    socket.on("room:kicked", onKicked);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    (async () => {
      try {
        await waitForConnection(socket);
      } catch (err) {
        setError((err as Error).message);
        setStatus("offline");
        return;
      }
      if (saved && savedProfile) {
        try {
          await rejoinWithRetry(() => join(savedProfile, saved.token));
          return;
        } catch {
          clearRoomSession(code);
        }
      }
      setStatus("needs-profile");
    })();

    return () => {
      socket.off("room:state", onState);
      socket.off("you:state", onPrivate);
      socket.off("round:image", onImage);
      socket.off("room:characters", setCharacters);
      if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
      imageUrlRef.current = null;
      socket.off("player:solved", onSolved);
      socket.off("room:kicked", onKicked);
      if (solvedTimer) clearTimeout(solvedTimer);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [code, join, toast]);

  /** Entrar pela tela de apelido. Mostra "sala não encontrada" se for o caso. */
  const enter = useCallback(
    async (chosen: Profile) => {
      setError(null);
      try {
        await join(chosen);
      } catch (err) {
        const message = (err as Error).message;
        if (message.startsWith("Sala não encontrada")) setStatus("not-found");
        setError(message);
        throw err;
      }
    },
    [join],
  );

  /** Executa uma ação no servidor e mostra o erro (se houver) como aviso. */
  const run = useCallback(
    async <T>(action: () => Promise<T>): Promise<T | undefined> => {
      try {
        return await action();
      } catch (err) {
        toast((err as Error).message, "error");
        return undefined;
      }
    },
    [toast],
  );

  const socket = () => getSocket();

  const actions = {
    start: () => run(async () => unwrap(await socket().emitWithAck("game:start"))),
    restart: () => run(async () => unwrap(await socket().emitWithAck("game:restart"))),
    updateSettings: (changes: Partial<RoomSettings>) =>
      run(async () => unwrap(await socket().emitWithAck("room:update-settings", changes))),
    kick: (playerId: string) =>
      run(async () => unwrap(await socket().emitWithAck("room:kick", { playerId }))),
    /** Devolve o erro em vez de mostrar aviso: o campo de palpite trata (balança). */
    guess: async (characterId: string) =>
      unwrap(await socket().emitWithAck("guess:submit", { characterId })),
    hint: (type: HintType) =>
      run(async () => unwrap(await socket().emitWithAck("hint:request", { type }))),
    leave: () => {
      socket().emit("room:leave");
      clearRoomSession(code);
      sessionRef.current = null;
    },
  };

  return {
    status,
    state,
    me,
    session,
    profile,
    error,
    connected,
    serverOffset,
    /** Personagens que podem ser chutados nesta partida (a lista vem do servidor). */
    characters,
    /** Só vale para a rodada atual; numa rodada nova, espere a imagem dela chegar. */
    roundImage:
      roundImage && state?.phase === "round" && state.round?.number === roundImage.round
        ? roundImage
        : null,
    enter,
    actions,
    isHost: !!state && !!session && state.hostId === session.playerId,
  };
}

export type UseRoom = ReturnType<typeof useRoom>;
