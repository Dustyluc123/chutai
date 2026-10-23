import {
  DEFAULT_SETTINGS,
  createRoomSchema,
  joinRoomSchema,
  kickPlayerSchema,
  updateSettingsSchema,
  type JoinedRoom,
} from "@chutai/shared";
import { GameError } from "../../lib/errors";
import { containsProfanity } from "../../lib/profanity";
import type { PlayerState, Room } from "../../rooms/Room";
import { identify } from "../middleware/identify";
import { playerChannel, roomChannel, type HandlerContext, type IoSocket } from "../types";
import { withValidation } from "./safe";

function assertCleanNickname(nickname: string) {
  if (containsProfanity(nickname)) throw new GameError("Escolha outro apelido, por favor.");
}

/** Liga esta conexão a um jogador de uma sala e manda o estado atual para ele. */
function attach(socket: IoSocket, room: Room, player: PlayerState): JoinedRoom {
  socket.join(roomChannel(room.code));
  socket.join(playerChannel(player.id));
  socket.data.roomCode = room.code;
  socket.data.playerId = player.id;
  room.setConnected(player.id, true);
  socket.emit("room:state", room.toPublicState());
  socket.emit("you:state", room.privateState(player.id));
  socket.emit("room:characters", room.characterOptions());
  // Modo Imagem: quem entra ou volta no meio da rodada recebe a imagem do seu nível.
  room.sendRoundImage(player.id);
  return { code: room.code, playerId: player.id, token: player.token };
}

/** Sai da sala atual de vez (botão "Sair" ou ao entrar em outra sala). */
function leaveCurrentRoom(socket: IoSocket, ctx: HandlerContext) {
  const { roomCode, playerId } = socket.data;
  if (!roomCode || !playerId) return;
  socket.leave(roomChannel(roomCode));
  socket.leave(playerChannel(playerId));
  socket.data.roomCode = undefined;
  socket.data.playerId = undefined;
  const room = ctx.manager.get(roomCode);
  room?.removePlayer(playerId);
  if (room && room.players.size === 0) ctx.manager.delete(roomCode);
}

export function registerRoomHandlers(socket: IoSocket, ctx: HandlerContext) {
  socket.on(
    "room:create",
    withValidation(createRoomSchema, async ({ nickname, avatar, settings }) => {
      assertCleanNickname(nickname);
      const merged = { ...DEFAULT_SETTINGS, ...settings };
      const theme = await ctx.themes.get(merged.themeSlug);
      if (!theme) throw new GameError("Tema não encontrado.");

      leaveCurrentRoom(socket, ctx);
      const room = await ctx.manager.create(theme, merged);
      const player = room.addPlayer(nickname, avatar);
      return attach(socket, room, player);
    }),
  );

  socket.on(
    "room:join",
    withValidation(joinRoomSchema, async ({ code, nickname, avatar, token }) => {
      // Pode estar só no Redis (o servidor reiniciou): carrega e continua a partida.
      const room = await ctx.manager.load(code);
      if (!room) throw new GameError("Sala não encontrada. Confira o código.");

      // Mesmo jogador voltando (recarregou a página, a internet caiu...)
      const existing = token ? room.findByToken(token) : undefined;
      if (existing) return attach(socket, room, existing);

      assertCleanNickname(nickname);
      if (socket.data.roomCode !== room.code) leaveCurrentRoom(socket, ctx);
      const player = room.addPlayer(nickname, avatar);
      return attach(socket, room, player);
    }),
  );

  socket.on("room:leave", () => leaveCurrentRoom(socket, ctx));

  socket.on(
    "room:update-settings",
    withValidation(updateSettingsSchema, async (changes) => {
      const { room, playerId } = identify(socket, ctx.manager);
      let theme;
      if (changes.themeSlug && changes.themeSlug !== room.theme.slug) {
        theme = await ctx.themes.get(changes.themeSlug);
        if (!theme) throw new GameError("Tema não encontrado.");
      }
      room.updateSettings(playerId, changes, theme ?? undefined);
      return null;
    }),
  );

  socket.on(
    "room:kick",
    withValidation(kickPlayerSchema, async ({ playerId: targetId }) => {
      const { room, playerId } = identify(socket, ctx.manager);
      room.kick(playerId, targetId);
      // Tira as conexões do expulso dos canais da sala.
      ctx.io.in(playerChannel(targetId)).socketsLeave(roomChannel(room.code));
      return null;
    }),
  );

  socket.on("disconnect", async () => {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId) return;
    const room = ctx.manager.get(roomCode);
    if (!room) return;
    // O jogador pode estar com outra aba aberta; só marca como desconectado se não houver nenhuma.
    const others = await ctx.io.in(playerChannel(playerId)).fetchSockets();
    if (others.length === 0) room.setConnected(playerId, false);
  });
}
