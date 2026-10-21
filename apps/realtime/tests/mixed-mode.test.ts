/**
 * Modo Misto: alterna rodadas Clássica e Imagem. Cada rodada segue as regras do seu tipo.
 */
import { describe, expect, it } from "vitest";
import { computeRoundPoints, roundKind } from "@chutai/game";
import type { CharacterOption, GuessResult } from "@chutai/shared";
import {
  createTestRoom,
  fakeRenderer,
  flush,
  imageTheme,
  partialTheme,
  theme,
  wrongCharacter,
} from "./helpers";

function mixedRoom(options: Parameters<typeof createTestRoom>[1] = {}) {
  let renders = 0;
  const ctx = createTestRoom(
    { mode: "mixed", rounds: 4, roundSeconds: 60 },
    {
      theme: imageTheme,
      renderRoundImages: async () => {
        renders += 1;
        return fakeRenderer();
      },
      ...options,
    },
  );
  const ana = ctx.room.addPlayer("Ana", "🦜");
  return { ...ctx, ana, renders: () => renders };
}

/** Passa a rodada atual (tempo esgotado) e o intervalo (3 s nos testes). */
function skipRound(clock: { advance(ms: number): void }) {
  clock.advance(60_000);
  clock.advance(3_000);
}

describe("modo Misto", () => {
  it("roundKind alterna começando pela Clássica; os outros modos não mudam", () => {
    expect([1, 2, 3, 4, 5].map((n) => roundKind("mixed", n))).toEqual([
      "classic",
      "image",
      "classic",
      "image",
      "classic",
    ]);
    expect(roundKind("image", 1)).toBe("image");
    expect(roundKind("classic", 2)).toBe("classic");
  });

  it("o servidor avisa o tipo de cada rodada e o da próxima no intervalo", () => {
    const { room, clock, sent, ana } = mixedRoom();
    room.start(ana.id);
    const kinds: string[] = [];
    for (let i = 0; i < 4; i++) {
      kinds.push(room.toPublicState().round!.kind);
      clock.advance(60_000);
      if (i < 3) {
        expect(room.toPublicState().nextRoundKind).toBe(i % 2 === 0 ? "image" : "classic");
      }
      clock.advance(3_000);
    }
    expect(kinds).toEqual(["classic", "image", "classic", "image"]);
    const starts = sent.filter((item) => item.event === "round:start").map((item) => item.args[0]);
    expect(starts.map((payload) => (payload as { kind: string }).kind)).toEqual(kinds);
  });

  it("rodadas de Imagem: só personagens com imagem no sorteio (tema parcial)", () => {
    // Tenta vários sorteios: nas rodadas de Imagem a resposta sempre tem imagem.
    let classicWithoutImage = false;
    for (let step = 0; step < 50; step++) {
      const value = step / 50;
      const { room, clock, ana } = mixedRoom({ theme: partialTheme, random: () => value });
      room.start(ana.id);
      for (let n = 1; n <= 4; n++) {
        const answer = room.peekAnswerForTests()!;
        if (room.toPublicState().round!.kind === "image") expect(answer.image).toBeTruthy();
        else if (!answer.image) classicWithoutImage = true;
        skipRound(clock);
      }
    }
    // Nas Clássicas, quem não tem imagem continua podendo cair.
    expect(classicWithoutImage).toBe(true);
  });

  it("pontuação segue o tipo da rodada: no Imagem o chute extra custa 80", () => {
    const { room, clock, ana } = mixedRoom();
    room.start(ana.id);

    const play = () => {
      clock.advance(10_000);
      room.guess(ana.id, wrongCharacter(room).id);
      const result: GuessResult = room.guess(ana.id, room.peekAnswerForTests()!.id);
      expect(result.correct).toBe(true);
    };
    const expected = (mode: "classic" | "image") =>
      computeRoundPoints({
        remainingMs: 50_000,
        totalMs: 60_000,
        guesses: 2,
        hintsUsed: 0,
        solveRank: 1,
        mode,
      });

    play(); // rodada 1, Clássica
    const afterClassic = room.players.get(ana.id)!.score;
    expect(afterClassic).toBe(expected("classic"));
    clock.advance(3_000); // intervalo (todos acertaram: a rodada já acabou)
    play(); // rodada 2, Imagem
    expect(room.players.get(ana.id)!.score - afterClassic).toBe(expected("image"));
    expect(expected("classic") - expected("image")).toBe(40);
  });

  it("Clássica tem atributos coloridos e imagens nas opções; Imagem não tem nenhum dos dois", async () => {
    const { room, clock, sent, ana, renders } = mixedRoom();
    room.start(ana.id);
    const classicGuess = room.guess(ana.id, wrongCharacter(room).id);
    expect(classicGuess.feedback.length).toBeGreaterThan(0);
    expect(classicGuess.image).toBeDefined();
    expect(renders()).toBe(0); // rodada Clássica: nenhuma imagem gerada

    sent.length = 0;
    skipRound(clock);
    await flush();
    expect(room.toPublicState().round!.kind).toBe("image");
    expect(renders()).toBe(1);
    const options = sent.find((item) => item.event === "room:characters")!
      .args[0] as CharacterOption[];
    expect(options.length).toBeGreaterThan(0);
    expect(JSON.stringify(options)).not.toMatch(/"image"|"emoji"/);
    const imageGuess = room.guess(ana.id, wrongCharacter(room).id);
    expect(imageGuess.feedback).toEqual([]);
    expect(imageGuess).not.toHaveProperty("image");
    expect(imageGuess).not.toHaveProperty("emoji");
    expect(sent.some((item) => item.event === "round:image")).toBe(true);

    // Volta a Clássica: lista com imagens de novo.
    sent.length = 0;
    skipRound(clock);
    const back = sent.find((item) => item.event === "room:characters")!
      .args[0] as CharacterOption[];
    expect(back.some((option) => option.image)).toBe(true);
  });

  it("nada da rodada de Imagem antes do Vai! (com a contagem)", async () => {
    const { room, clock, sent, ana, renders } = mixedRoom({ countdownMs: 5_000 });
    room.start(ana.id);
    clock.advance(5_000); // rodada 1 (Clássica)
    clock.advance(60_000); // acabou
    clock.advance(2_999); // intervalo quase no fim
    await flush();
    expect(renders()).toBe(0);
    expect(sent.some((item) => item.event === "round:image")).toBe(false);
    clock.advance(1);
    await flush();
    expect(renders()).toBe(1);
  });

  it("só fica disponível em tema com modo Imagem; trocar de tema volta para Clássico", () => {
    const blocked = createTestRoom({}, { theme });
    const ana = blocked.room.addPlayer("Ana", "🦜");
    expect(() => blocked.room.updateSettings(ana.id, { mode: "mixed" })).toThrow("modo Imagem");

    const { room, ana: host } = mixedRoom();
    expect(room.settings.mode).toBe("mixed");
    room.updateSettings(host.id, { themeSlug: theme.slug }, theme);
    expect(room.settings.mode).toBe("classic");
  });
});
