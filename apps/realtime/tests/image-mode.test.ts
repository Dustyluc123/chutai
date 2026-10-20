/**
 * Modo Imagem na sala (relógio falso, gerador de imagens falso).
 * O que mais importa aqui: ninguém recebe um nível de nitidez acima do que alcançou,
 * e nada que identifique a resposta sai antes do fim da rodada.
 */
import { describe, expect, it } from "vitest";
import { IMAGE_MODE, MAX_ROUND_IMAGE_LEVEL } from "@chutai/game";
import type { RoundImage } from "@chutai/shared";
import { createTestRoom, fakeRenderer, flush, imageTheme, theme, wrongCharacter } from "./helpers";

function imageRoom(overrides = {}) {
  const ctx = createTestRoom(
    { mode: "image", ...overrides },
    { theme: imageTheme, renderRoundImages: fakeRenderer },
  );
  const ana = ctx.room.addPlayer("Ana", "🦜");
  const bia = ctx.room.addPlayer("Bia", "🐆");
  return { ...ctx, ana, bia };
}

/** Imagens enviadas até agora, com quem recebeu e o texto do buffer falso. */
function imagesSent(sent: { to: string; event: string; args: unknown[] }[]) {
  return sent
    .filter((item) => item.event === "round:image")
    .map((item) => {
      const image = item.args[0] as RoundImage;
      return {
        to: item.to,
        level: image.level,
        text: new TextDecoder().decode(image.data as Uint8Array),
      };
    });
}

describe("modo Imagem: regras da sala", () => {
  it("só pode ser escolhido em tema com imagem para todos os personagens", () => {
    const { room } = createTestRoom({}, { theme });
    const ana = room.addPlayer("Ana", "🦜");
    expect(() => room.updateSettings(ana.id, { mode: "image" })).toThrow("modo Imagem");
    expect(room.settings.mode).toBe("classic");
  });

  it("criar sala com modo Imagem num tema sem imagens cai no Clássico", () => {
    const { room } = createTestRoom({ mode: "image" }, { theme });
    expect(room.settings.mode).toBe("classic");
  });

  it("trocar para um tema sem todas as imagens volta para o Clássico", () => {
    const { room, ana } = imageRoom();
    expect(room.settings.mode).toBe("image");
    room.updateSettings(ana.id, { themeSlug: theme.slug }, theme);
    expect(room.settings.mode).toBe("classic");
  });
});

describe("modo Imagem: nitidez por jogador", () => {
  it("cada jogador começa no nível 0, recebido só por ele", async () => {
    const { room, sent, ana, bia } = imageRoom();
    room.start(ana.id);
    await flush();
    expect(imagesSent(sent)).toEqual([
      { to: ana.id, level: 0, text: "nivel-0" },
      { to: bia.id, level: 0, text: "nivel-0" },
    ]);
  });

  it("chute errado libera o próximo nível só para quem chutou", async () => {
    const { room, sent, ana, bia } = imageRoom();
    room.start(ana.id);
    await flush();
    sent.length = 0;

    room.guess(ana.id, wrongCharacter(room).id);
    expect(imagesSent(sent)).toEqual([{ to: ana.id, level: 1, text: "nivel-1" }]);
    expect(room.privateState(ana.id).image?.level).toBe(1);
    expect(room.privateState(bia.id).image?.level).toBe(0);
  });

  it("dica também deixa a imagem mais nítida", async () => {
    const { room, sent, ana } = imageRoom();
    room.start(ana.id);
    await flush();
    const skip: string[] = [];
    for (let i = 0; i < 3; i++) {
      const wrong = wrongCharacter(room, skip);
      skip.push(wrong.id);
      room.guess(ana.id, wrong.id);
    }
    sent.length = 0;
    room.hint(ana.id, "firstLetter");
    expect(imagesSent(sent)).toEqual([{ to: ana.id, level: 4, text: "nivel-4" }]);
  });

  it("nunca passa do nível máximo da rodada, por mais chutes que dê", async () => {
    const { room, sent, ana } = imageRoom({ roundSeconds: 300 });
    room.start(ana.id);
    await flush();
    const skip: string[] = [];
    for (let i = 0; i < 12; i++) {
      const wrong = wrongCharacter(room, skip);
      skip.push(wrong.id);
      room.guess(ana.id, wrong.id);
    }
    const levels = imagesSent(sent).map((item) => item.level);
    expect(Math.max(...levels)).toBe(MAX_ROUND_IMAGE_LEVEL);
    expect(levels.filter((level) => level === MAX_ROUND_IMAGE_LEVEL)).toHaveLength(1);
    expect(room.privateState(ana.id).image?.level).toBe(MAX_ROUND_IMAGE_LEVEL);
  });

  it("quem reconecta recebe de novo o nível que já tinha, não um acima", async () => {
    const { room, sent, ana } = imageRoom();
    room.start(ana.id);
    await flush();
    room.guess(ana.id, wrongCharacter(room).id);
    sent.length = 0;
    room.sendRoundImage(ana.id);
    expect(imagesSent(sent)).toEqual([{ to: ana.id, level: 1, text: "nivel-1" }]);
  });

  it("não manda imagem fora da rodada nem para quem não está na sala", async () => {
    const { room, sent, ana, clock } = imageRoom();
    room.sendRoundImage(ana.id);
    room.start(ana.id);
    await flush();
    sent.length = 0;
    room.sendRoundImage("intruso");
    clock.advance(60_000);
    room.sendRoundImage(ana.id);
    expect(imagesSent(sent)).toEqual([]);
  });

  it("se a geração falhar, o jogador fica sabendo e ninguém recebe imagem", async () => {
    const { room, sent } = createTestRoom(
      { mode: "image" },
      { theme: imageTheme, renderRoundImages: () => Promise.reject(new Error("sem rede")) },
    );
    const ana = room.addPlayer("Ana", "🦜");
    room.start(ana.id);
    expect(room.privateState(ana.id).image?.status).toBe("loading");
    await flush();
    expect(room.privateState(ana.id).image?.status).toBe("error");
    expect(imagesSent(sent)).toEqual([]);
  });
});

describe("modo Imagem: nada vaza", () => {
  it("estado público, estado privado e eventos não identificam a resposta", async () => {
    const { room, sent, ana, bia } = imageRoom();
    room.start(ana.id);
    await flush();
    const answer = room.peekAnswerForTests()!;
    room.guess(bia.id, wrongCharacter(room).id);

    const texts = [
      JSON.stringify(room.toPublicState()),
      JSON.stringify(room.privateState(ana.id)),
      JSON.stringify(room.privateState(bia.id)),
      ...sent.filter((item) => item.event !== "round:image").map((item) => JSON.stringify(item)),
    ];
    for (const text of texts) {
      expect(text).not.toContain(`"${answer.id}"`);
      expect(text).not.toContain(answer.name);
      expect(text).not.toContain(answer.image!);
    }
    // A imagem nunca vai para a sala inteira.
    expect(sent.some((item) => item.event === "round:image" && item.to === "all")).toBe(false);
  });

  it("o palpite não traz atributos coloridos", async () => {
    const { room, ana } = imageRoom();
    room.start(ana.id);
    await flush();
    expect(room.guess(ana.id, wrongCharacter(room).id).feedback).toEqual([]);
  });

  it("o placar mostra a nitidez de cada um, que só depende de chutes e dicas", async () => {
    const { room, ana, bia } = imageRoom();
    room.start(ana.id);
    await flush();
    room.guess(ana.id, wrongCharacter(room).id);
    const progress = room.toPublicState().round!.progress;
    expect(progress.find((p) => p.playerId === ana.id)?.imageLevel).toBe(1);
    expect(progress.find((p) => p.playerId === bia.id)?.imageLevel).toBe(0);
  });

  it("a revelação traz a imagem nítida, e só depois da rodada", async () => {
    const { room, sent, ana, clock } = imageRoom();
    room.start(ana.id);
    await flush();
    const answer = room.peekAnswerForTests()!;
    clock.advance(60_000);
    const end = sent.find((item) => item.event === "round:end");
    expect(end?.args[0]).toMatchObject({ character: { id: answer.id, image: answer.image } });
  });

  it("acertar dá pontos com o desconto do modo Imagem", async () => {
    const { room, ana } = imageRoom();
    room.start(ana.id);
    await flush();
    room.guess(ana.id, wrongCharacter(room).id);
    room.guess(ana.id, room.peekAnswerForTests()!.id);
    // 500 + 500 (tempo cheio) − 80 (1 chute extra) + 100 (primeiro)
    expect(room.players.get(ana.id)!.score).toBe(1000 + 100 - IMAGE_MODE.perExtraGuess);
  });
});
