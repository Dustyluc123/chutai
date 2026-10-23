import { describe, expect, it } from "vitest";
import { podiumTitle, podiumTop, shareText } from "@/lib/podium";

const entry = (position: number, nickname: string, score: number) => ({
  position,
  nickname,
  score,
});

describe("pódio de compartilhar", () => {
  it("texto com os 3 primeiros e os pontos no formato brasileiro", () => {
    const standings = [
      entry(1, "Lucas", 1567),
      entry(2, "Bia", 1324),
      entry(3, "Caio", 990),
      entry(4, "Duda", 500),
    ];
    expect(shareText("Folclore brasileiro", standings, "https://chutai-bay.vercel.app")).toBe(
      "Joguei Chutaí no tema Folclore brasileiro: 1º Lucas (1.567), 2º Bia (1.324), 3º Caio (990). Jogue também: https://chutai-bay.vercel.app",
    );
  });

  it("funciona com 1 e 2 jogadores", () => {
    expect(shareText("Fauna", [entry(1, "Ana", 800)], "https://x")).toBe(
      "Joguei Chutaí no tema Fauna: 1º Ana (800). Jogue também: https://x",
    );
    expect(podiumTop([entry(1, "Ana", 800), entry(2, "Bia", 0)]).top).toHaveLength(2);
    expect(podiumTitle([entry(1, "Ana", 800)])).toBe("Ana ganhou!");
  });

  it("empates: mesma posição e quem empatou com o 3º e ficou de fora é contado", () => {
    const standings = [
      entry(1, "Ana", 1000),
      entry(1, "Bia", 1000),
      entry(3, "Caio", 700),
      entry(3, "Duda", 700),
      entry(3, "Edu", 700),
      entry(6, "Fê", 100),
    ];
    expect(podiumTop(standings).tiedOut).toBe(2);
    expect(podiumTitle(standings)).toBe("Ana e Bia empataram!");
    expect(shareText("Fauna", standings, "https://x")).toBe(
      "Joguei Chutaí no tema Fauna: 1º Ana (1.000), 1º Bia (1.000), 3º Caio (700) e mais 2 empatados. Jogue também: https://x",
    );
  });
});

describe("versão do pódio (cache da imagem)", () => {
  it("o mesmo pódio dá a mesma versão; outro resultado dá outra", async () => {
    const { podiumVersion } = await import("@/lib/podium");
    const a = [
      { playerId: "a", score: 1200 },
      { playerId: "b", score: 900 },
    ];
    expect(podiumVersion(a)).toBe(podiumVersion([...a.map((s) => ({ ...s }))]));
    expect(podiumVersion(a)).not.toBe(podiumVersion([{ ...a[0]!, score: 1250 }, a[1]!]));
    expect(podiumVersion(a)).toMatch(/^[0-9a-z]{1,8}$/);
  });
});
