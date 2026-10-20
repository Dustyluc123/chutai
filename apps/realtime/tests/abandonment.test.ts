import { describe, expect, it } from "vitest";
import { ROOM_LIFECYCLE } from "@chutai/game";
import { createTestRoom, fakeRenderer, imageTheme } from "./helpers";

const ABANDONED_MS = ROOM_LIFECYCLE.abandonedSeconds * 1000;

/** Sala com dois jogadores e a partida já começada. */
function startedRoom(options: Parameters<typeof createTestRoom>[1] = {}) {
  const test = createTestRoom({ rounds: 3, roundSeconds: 60 }, options);
  const ana = test.room.addPlayer("Ana", "🦜");
  const bia = test.room.addPlayer("Bia", "🐆");
  test.room.start(ana.id);
  return { ...test, ana, bia };
}

describe("Room: sala abandonada no meio da partida", () => {
  it("todos saem: a partida termina e a sala é encerrada depois de 60 s", () => {
    const { room, clock, abandoned, finished, ana, bia } = startedRoom();
    clock.advance(10_000);
    room.setConnected(ana.id, false);
    room.setConnected(bia.id, false);

    clock.advance(ABANDONED_MS - 1);
    expect(abandoned).toHaveLength(0);
    clock.advance(1);
    expect(abandoned).toEqual([room]);
    // Encerrada por abandono não conta como partida terminada (nada vai para o histórico).
    expect(finished).toHaveLength(0);
  });

  it("todos saem e um volta aos 30 s: a partida continua", () => {
    const { room, clock, abandoned, ana, bia } = startedRoom();
    room.setConnected(ana.id, false);
    room.setConnected(bia.id, false);
    clock.advance(30_000);
    room.setConnected(bia.id, true);

    clock.advance(ABANDONED_MS * 3);
    expect(abandoned).toHaveLength(0);
    // Passou da primeira rodada (60 s) para as seguintes normalmente.
    expect(room.toPublicState().round?.number ?? room.toPublicState().lastRound?.number).toBe(3);
  });

  it("recarregar a página (sai e volta em 1 s) nunca derruba a sala", () => {
    const { room, clock, abandoned, ana, bia } = startedRoom();
    room.setConnected(bia.id, false);
    for (let i = 0; i < 5; i++) {
      room.setConnected(ana.id, false);
      clock.advance(1_000);
      room.setConnected(ana.id, true);
      clock.advance(ABANDONED_MS - 1_000);
    }
    expect(abandoned).toHaveLength(0);
  });

  it("sem ninguém conectado, não começa rodada nova", () => {
    const { room, clock, sent, ana, bia } = startedRoom();
    clock.advance(50_000);
    room.setConnected(ana.id, false);
    room.setConnected(bia.id, false);
    // A rodada 1 acaba pelo tempo (60 s) e o intervalo (3 s nos testes) passa...
    clock.advance(20_000);
    expect(room.phase).toBe("intermission");
    // ...mas a rodada 2 não começa.
    expect(sent.filter((item) => item.event === "round:start")).toHaveLength(1);
  });

  it("quem volta para a sala parada recebe a rodada seguinte logo depois", () => {
    const { room, clock, sent, abandoned, ana, bia } = startedRoom();
    clock.advance(50_000);
    room.setConnected(ana.id, false);
    room.setConnected(bia.id, false);
    clock.advance(20_000); // rodada 1 acabou, intervalo passou, rodada 2 parada
    room.setConnected(ana.id, true);
    const state = room.toPublicState();
    expect(state.phase).toBe("intermission");
    expect(state.intermissionEndsAt).toBe(clock.time + ROOM_LIFECYCLE.resumeSeconds * 1000);

    clock.advance(ROOM_LIFECYCLE.resumeSeconds * 1000);
    expect(room.phase).toBe("round");
    expect(room.toPublicState().round?.number).toBe(2);
    expect(sent.filter((item) => item.event === "round:start")).toHaveLength(2);
    expect(abandoned).toHaveLength(0);
  });

  it("modo Imagem: sem ninguém conectado, não gera imagens de rodada nova", () => {
    let renders = 0;
    const { room, clock } = createTestRoom(
      { rounds: 3, roundSeconds: 60, mode: "image" },
      {
        theme: imageTheme,
        renderRoundImages: async () => {
          renders += 1;
          return fakeRenderer();
        },
      },
    );
    const ana = room.addPlayer("Ana", "🦜");
    room.start(ana.id);
    expect(renders).toBe(1); // rodada 1, com a Ana conectada
    clock.advance(50_000);
    room.setConnected(ana.id, false);
    clock.advance(20_000);
    expect(room.phase).toBe("intermission");
    expect(renders).toBe(1);
    room.setConnected(ana.id, true);
    clock.advance(ROOM_LIFECYCLE.resumeSeconds * 1000);
    expect(renders).toBe(2); // alguém voltou: aí sim a rodada 2 e a imagem dela
  });

  it("depois do pódio, a sala vazia não é encerrada por abandono (fica para a limpeza normal)", () => {
    const { room, clock, abandoned, ana, bia } = startedRoom();
    clock.advance(3 * 60_000 + 2 * 3_000); // três rodadas e dois intervalos
    expect(room.phase).toBe("finished");
    room.setConnected(ana.id, false);
    room.setConnected(bia.id, false);
    clock.advance(ABANDONED_MS * 2);
    expect(abandoned).toHaveLength(0);
  });
});
