import type { ServerToClientEvents, Theme } from "@chutai/shared";
import { OFFICIAL_THEMES } from "@chutai/db";
import type { MatchRecord } from "@chutai/db";
import { Room, type RoomEmitter } from "../src/rooms/Room";

export const theme: Theme = OFFICIAL_THEMES[0]!;

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

export function createTestRoom(overrides: Partial<Room["settings"]> = {}) {
  const clock = new FakeClock();
  const sent: Sent[] = [];
  const finished: MatchRecord[] = [];
  const emitter: RoomEmitter = {
    broadcast: (event, ...args) => sent.push({ to: "all", event, args }),
    toPlayer: (playerId, event, ...args) => sent.push({ to: playerId, event, args }),
  };
  const room = new Room(
    "ABC234",
    theme,
    {
      themeSlug: theme.slug,
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
    },
  );
  return { room, clock, sent, finished };
}

/** Um personagem do tema que NÃO é a resposta atual. */
export function wrongCharacter(room: Room, skip: string[] = []) {
  const answer = room.peekAnswerForTests()!;
  return theme.characters.find((c) => c.id !== answer.id && !skip.includes(c.id))!;
}
