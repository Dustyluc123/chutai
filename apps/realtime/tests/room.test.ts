import { describe, expect, it } from "vitest";
import { GameError } from "../src/lib/errors";
import { createTestRoom, wrongCharacter } from "./helpers";

describe("Room: lobby", () => {
  it("o primeiro a entrar vira anfitrião", () => {
    const { room } = createTestRoom();
    const ana = room.addPlayer("Ana", "🦜");
    room.addPlayer("Bia", "🐆");
    expect(room.hostId).toBe(ana.id);
    expect(room.toPublicState().players.map((p) => p.isHost)).toEqual([true, false]);
  });

  it("não deixa entrar com a sala cheia e evita apelidos repetidos", () => {
    const { room } = createTestRoom({ maxPlayers: 2 });
    room.addPlayer("Ana", "🦜");
    const other = room.addPlayer("ana", "🐆");
    expect(other.nickname).not.toBe("ana");
    expect(() => room.addPlayer("Caio", "🐊")).toThrow(GameError);
  });

  it("só o anfitrião muda regras e começa", () => {
    const { room } = createTestRoom();
    const ana = room.addPlayer("Ana", "🦜");
    const bia = room.addPlayer("Bia", "🐆");
    expect(() => room.updateSettings(bia.id, { rounds: 3 })).toThrow("anfitrião");
    room.updateSettings(ana.id, { rounds: 3 });
    expect(room.settings.rounds).toBe(3);
    expect(() => room.start(bia.id)).toThrow("anfitrião");
  });

  it("quem cai no lobby sai depois do tempo de tolerância e o anfitrião passa adiante", () => {
    const { room, clock } = createTestRoom();
    const ana = room.addPlayer("Ana", "🦜");
    const bia = room.addPlayer("Bia", "🐆");
    room.setConnected(ana.id, false);
    clock.advance(4_000);
    expect(room.players.has(ana.id)).toBe(true); // ainda dá tempo de voltar
    clock.advance(2_000);
    expect(room.players.has(ana.id)).toBe(false);
    expect(room.hostId).toBe(bia.id);
  });

  it("quem recarrega a página dentro da tolerância mantém o lugar", () => {
    const { room, clock } = createTestRoom();
    const ana = room.addPlayer("Ana", "🦜");
    room.setConnected(ana.id, false);
    clock.advance(2_000);
    expect(room.findByToken(ana.token)?.id).toBe(ana.id);
    room.setConnected(ana.id, true);
    clock.advance(10_000);
    expect(room.players.has(ana.id)).toBe(true);
  });
});

describe("Room: partida", () => {
  it("nunca manda a resposta no estado público", () => {
    const { room } = createTestRoom();
    const ana = room.addPlayer("Ana", "🦜");
    room.start(ana.id);
    const answer = room.peekAnswerForTests()!;
    expect(JSON.stringify(room.toPublicState())).not.toContain(answer.name);
  });

  it("palpite errado devolve atributos; certo dá pontos e termina a rodada quando todos acertam", () => {
    const { room, clock, sent } = createTestRoom();
    const ana = room.addPlayer("Ana", "🦜");
    const bia = room.addPlayer("Bia", "🐆");
    room.start(ana.id);
    const answer = room.peekAnswerForTests()!;

    const miss = room.guess(ana.id, wrongCharacter(room).id);
    expect(miss.correct).toBe(false);
    expect(miss.feedback).toHaveLength(room.theme.attributes.length);
    expect(() => room.guess(ana.id, miss.characterId)).toThrow("já chutou");

    clock.advance(30_000); // metade do tempo
    const hit = room.guess(ana.id, answer.id);
    expect(hit.correct).toBe(true);
    // 500 + 250 (metade do tempo) − 40 (1 chute extra) + 100 (primeiro) = 810
    expect(room.players.get(ana.id)?.score).toBe(810);
    expect(room.phase).toBe("round");
    expect(sent.some((s) => s.event === "player:solved")).toBe(true);

    room.guess(bia.id, answer.id);
    expect(room.phase).toBe("intermission");
    const summary = room.toPublicState().lastRound!;
    expect(summary.character.name).toBe(answer.name);
    expect(summary.results.map((r) => r.solveRank)).toEqual([1, 2]);
  });

  it("tempo esgotado encerra a rodada e a próxima começa sozinha", () => {
    const { room, clock } = createTestRoom();
    const ana = room.addPlayer("Ana", "🦜");
    room.start(ana.id);
    const first = room.peekAnswerForTests()!;
    clock.advance(60_000);
    expect(room.phase).toBe("intermission");
    clock.advance(3_000);
    expect(room.phase).toBe("round");
    expect(room.toPublicState().round?.number).toBe(2);
    expect(room.peekAnswerForTests()!.id).not.toBe(first.id);
  });

  it("depois da última rodada mostra o pódio e salva a partida", () => {
    const { room, clock, finished } = createTestRoom({ rounds: 1 });
    const ana = room.addPlayer("Ana", "🦜");
    const bia = room.addPlayer("Bia", "🐆");
    room.start(ana.id);
    room.guess(bia.id, room.peekAnswerForTests()!.id);
    clock.advance(60_000);

    const state = room.toPublicState();
    expect(state.phase).toBe("finished");
    expect(state.standings?.[0]?.nickname).toBe("Bia");
    expect(state.standings?.[0]?.roundsSolved).toBe(1);
    expect(finished).toHaveLength(1);
    expect(finished[0]?.rounds[0]?.guesses).toHaveLength(1);

    room.restart(ana.id);
    expect(room.phase).toBe("lobby");
    expect([...room.players.values()].every((p) => p.score === 0)).toBe(true);
  });

  it("empate divide a mesma posição no pódio", () => {
    const { room, clock } = createTestRoom({ rounds: 1 });
    const ana = room.addPlayer("Ana", "🦜");
    room.addPlayer("Bia", "🐆");
    room.start(ana.id);
    clock.advance(60_000);
    expect(room.toPublicState().standings?.map((s) => s.position)).toEqual([1, 1]);
  });

  it("dicas só depois de 3 chutes e custam pontos", () => {
    const { room } = createTestRoom();
    const ana = room.addPlayer("Ana", "🦜");
    room.start(ana.id);
    expect(() => room.hint(ana.id, "firstLetter")).toThrow("chutes");

    const used: string[] = [];
    for (let i = 0; i < 3; i++) {
      const wrong = wrongCharacter(room, used);
      used.push(wrong.id);
      room.guess(ana.id, wrong.id);
    }
    const hint = room.hint(ana.id, "firstLetter");
    expect(hint.text).toContain(room.peekAnswerForTests()!.name.charAt(0).toUpperCase());
    expect(room.privateState(ana.id).hints).toHaveLength(1);

    room.guess(ana.id, room.peekAnswerForTests()!.id);
    // 500 + 500 (tempo cheio) − 120 (3 extras) − 150 (dica) + 100 = 830
    expect(room.players.get(ana.id)?.score).toBe(830);
  });

  it("dicas desligadas são recusadas", () => {
    const { room } = createTestRoom({ hintsEnabled: false });
    const ana = room.addPlayer("Ana", "🦜");
    room.start(ana.id);
    expect(() => room.hint(ana.id, "attribute")).toThrow("desligadas");
  });

  it("jogador que cai no meio da rodada não trava o fim antecipado", () => {
    const { room } = createTestRoom();
    const ana = room.addPlayer("Ana", "🦜");
    const bia = room.addPlayer("Bia", "🐆");
    room.start(ana.id);
    room.guess(ana.id, room.peekAnswerForTests()!.id);
    expect(room.phase).toBe("round");
    room.setConnected(bia.id, false);
    expect(room.phase).toBe("intermission");
  });

  it("expulsar avisa o jogador e tira da sala", () => {
    const { room, sent } = createTestRoom();
    const ana = room.addPlayer("Ana", "🦜");
    const bia = room.addPlayer("Bia", "🐆");
    room.kick(ana.id, bia.id);
    expect(room.players.has(bia.id)).toBe(false);
    expect(sent.some((s) => s.to === bia.id && s.event === "room:kicked")).toBe(true);
  });
});
