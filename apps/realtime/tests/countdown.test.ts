import { describe, expect, it } from "vitest";
import { TIMING } from "@chutai/game";
import { createTestRoom, fakeRenderer, flush, imageTheme } from "./helpers";

const COUNTDOWN_MS = TIMING.startCountdownSeconds * 1000;

function countdownRoom(overrides: Parameters<typeof createTestRoom>[0] = {}, options = {}) {
  const test = createTestRoom(
    { rounds: 2, roundSeconds: 60, ...overrides },
    { countdownMs: COUNTDOWN_MS, ...options },
  );
  const ana = test.room.addPlayer("Ana", "🦜");
  const bia = test.room.addPlayer("Bia", "🐆");
  return { ...test, ana, bia };
}

describe("Room: contagem antes da primeira rodada", () => {
  it("começar leva para a contagem, com horário de término dado pelo servidor", () => {
    const { room, clock, ana } = countdownRoom();
    room.start(ana.id);
    const state = room.toPublicState();
    expect(state.phase).toBe("countdown");
    expect(state.countdownEndsAt).toBe(clock.time + COUNTDOWN_MS);
    expect(state.round).toBeUndefined();
  });

  it("palpite e dica durante a contagem são recusados", () => {
    const { room, ana, bia } = countdownRoom();
    room.start(ana.id);
    const someone = room.theme.characters[0]!;
    expect(() => room.guess(bia.id, someone.id)).toThrow("A rodada ainda não começou.");
    expect(() => room.hint(bia.id, "attribute")).toThrow("A rodada ainda não começou.");
  });

  it("o cronômetro da rodada só começa no fim da contagem", () => {
    const { room, clock, ana } = countdownRoom();
    const pressedAt = clock.time;
    room.start(ana.id);
    clock.advance(COUNTDOWN_MS - 1);
    expect(room.phase).toBe("countdown");
    clock.advance(1);

    const round = room.toPublicState().round!;
    expect(room.phase).toBe("round");
    expect(round.startedAt).toBe(pressedAt + COUNTDOWN_MS);
    // A rodada tem os 60 s inteiros, contados a partir do "Vai!".
    expect(round.endsAt - round.startedAt).toBe(60_000);
    expect(room.toPublicState().countdownEndsAt).toBeUndefined();
  });

  it("nada da rodada é enviado antes do Vai! (nem a imagem borrada)", async () => {
    let renders = 0;
    const { room, clock, sent, ana } = countdownRoom(
      { mode: "image" },
      {
        theme: imageTheme,
        renderRoundImages: async () => {
          renders += 1;
          return fakeRenderer();
        },
      },
    );
    room.start(ana.id);
    clock.advance(COUNTDOWN_MS - 1);
    await flush();
    const roundEvents = ["round:start", "round:image", "round:end"];
    expect(sent.filter((item) => roundEvents.includes(item.event))).toEqual([]);
    expect(room.peekAnswerForTests()).toBeUndefined(); // nem sorteou ainda
    expect(renders).toBe(0);

    clock.advance(1);
    await flush();
    expect(sent.some((item) => item.event === "round:start")).toBe(true);
    expect(sent.some((item) => item.event === "round:image")).toBe(true);
  });

  it("entre rodadas não há contagem nova: o intervalo continua do mesmo tamanho", () => {
    const { room, clock, ana } = countdownRoom();
    room.start(ana.id);
    clock.advance(COUNTDOWN_MS + 60_000);
    const state = room.toPublicState();
    expect(state.phase).toBe("intermission");
    expect(state.intermissionEndsAt).toBe(clock.time + 3_000); // intervalo dos testes
    clock.advance(3_000);
    expect(room.phase).toBe("round");
  });

  it("todos saem durante a contagem: a primeira rodada não começa sem ninguém", () => {
    const { room, clock, sent, ana, bia } = countdownRoom();
    room.start(ana.id);
    room.setConnected(ana.id, false);
    room.setConnected(bia.id, false);
    clock.advance(COUNTDOWN_MS);
    expect(room.phase).toBe("countdown");
    expect(sent.some((item) => item.event === "round:start")).toBe(false);
    room.setConnected(ana.id, true);
    clock.advance(3_000);
    expect(room.phase).toBe("round");
  });
});
