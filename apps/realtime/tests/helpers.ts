import type { ServerToClientEvents, Theme } from "@chutai/shared";
import { OFFICIAL_THEMES } from "@chutai/db";
import type { MatchRecord } from "@chutai/db";
import { Room, type RoomDeps, type RoomEmitter } from "../src/rooms/Room";

export const theme: Theme = OFFICIAL_THEMES[0]!;
/** Tema com imagem para todos os personagens (o único que aceita o modo Imagem). */
export const imageTheme: Theme = OFFICIAL_THEMES.find((t) => t.slug === "fauna-brasileira")!;

/** Gerador falso: cada nível vira um buffer com o texto "nivel-N", fácil de conferir. */
export const fakeRenderer = async () =>
  Array.from({ length: 5 }, (_, level) => new TextEncoder().encode(`nivel-${level}`));

/** Deixa as promessas pendentes (como a geração de imagens) terminarem. */
export const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Relógio e agendador falsos: o teste decide quando o tempo passa. */
export class FakeClock {
  time = 1_000_000;
  private timers: { at: number; fn: () => void; cancelled: boolean }[] = [];

  now = () => this.time;

  schedule = (fn: () => void, ms: number) => {
    const timer = { at: this.time + ms, fn, cancelled: false };
    this.timers.push(timer);
    return () => {
      timer.cancelled = true;
    };
  };

  advance(ms: number) {
    const target = this.time + ms;
    for (;;) {
      const next = this.timers
        .filter((t) => !t.cancelled && t.at <= target)
        .sort((a, b) => a.at - b.at)[0];
      if (!next) break;
      this.time = next.at;
      next.cancelled = true;
      next.fn();
    }
    this.time = target;
  }
}

type Sent = { to: "all" | string; event: keyof ServerToClientEvents; args: unknown[] };

export function createTestRoom(
  overrides: Partial<Room["settings"]> = {},
  options: { theme?: Theme; renderRoundImages?: RoomDeps["renderRoundImages"] } = {},
) {
  const roomTheme = options.theme ?? theme;
  const clock = new FakeClock();
  const sent: Sent[] = [];
  const finished: MatchRecord[] = [];
  const emitter: RoomEmitter = {
    broadcast: (event, ...args) => sent.push({ to: "all", event, args }),
    toPlayer: (playerId, event, ...args) => sent.push({ to: playerId, event, args }),
  };
  const room = new Room(
    "ABC234",
    roomTheme,
    {
      themeSlug: roomTheme.slug,
      mode: "classic",
      rounds: 2,
      roundSeconds: 60,
      hintsEnabled: true,
      maxPlayers: 4,
      ...overrides,
    },
    {
      emitter,
      now: clock.now,
      schedule: clock.schedule,
      random: () => 0,
      disconnectGraceMs: 5_000,
      intermissionMs: 3_000,
      onFinished: (record) => finished.push(record),
      renderRoundImages: options.renderRoundImages,
    },
  );
  return { room, clock, sent, finished };
}

/** Um personagem do tema que NÃO é a resposta atual. */
export function wrongCharacter(room: Room, skip: string[] = []) {
  const answer = room.peekAnswerForTests()!;
  return room.theme.characters.find((c) => c.id !== answer.id && !skip.includes(c.id))!;
}
