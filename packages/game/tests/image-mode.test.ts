import { describe, expect, it } from "vitest";
import { IMAGE_MODE } from "../src/config";
import {
  MAX_ROUND_IMAGE_LEVEL,
  imageEffect,
  imageLevel,
  supportsImageMode,
} from "../src/image-mode";
import { computeRoundPoints } from "../src/scoring";

describe("imageLevel", () => {
  it("começa no nível mais borrado", () => {
    expect(imageLevel({ wrongGuesses: 0, hintsUsed: 0 })).toBe(0);
  });

  it("sobe um nível por chute errado e um por dica", () => {
    expect(imageLevel({ wrongGuesses: 1, hintsUsed: 0 })).toBe(1);
    expect(imageLevel({ wrongGuesses: 2, hintsUsed: 1 })).toBe(3);
  });

  it("nunca chega à imagem nítida durante a rodada", () => {
    expect(MAX_ROUND_IMAGE_LEVEL).toBe(IMAGE_MODE.levels - 2);
    expect(imageLevel({ wrongGuesses: 50, hintsUsed: 2 })).toBe(MAX_ROUND_IMAGE_LEVEL);
  });

  it("ignora números negativos", () => {
    expect(imageLevel({ wrongGuesses: -3, hintsUsed: -1 })).toBe(0);
  });
});

describe("imageEffect", () => {
  it("tem um efeito para cada nível da rodada, cada vez mais nítido", () => {
    const effects = Array.from({ length: MAX_ROUND_IMAGE_LEVEL + 1 }, (_, level) =>
      imageEffect(level),
    );
    for (let i = 1; i < effects.length; i++) {
      expect(effects[i]!.pixels).toBeGreaterThan(effects[i - 1]!.pixels);
      expect(effects[i]!.blur).toBeLessThan(effects[i - 1]!.blur);
    }
  });

  it("recusa o nível nítido e níveis inventados", () => {
    expect(() => imageEffect(MAX_ROUND_IMAGE_LEVEL + 1)).toThrow();
    expect(() => imageEffect(-1)).toThrow();
    expect(() => imageEffect(1.5)).toThrow();
  });
});

describe("supportsImageMode", () => {
  it("só aceita temas em que todos os personagens têm imagem", () => {
    expect(supportsImageMode([{ image: "/a.webp" }, { image: "/b.webp" }])).toBe(true);
    expect(supportsImageMode([{ image: "/a.webp" }, {}])).toBe(false);
    expect(supportsImageMode([])).toBe(false);
  });
});

describe("pontuação no modo Imagem", () => {
  it("cada chute extra custa 80 em vez de 40", () => {
    const base = { remainingMs: 60_000, totalMs: 90_000, guesses: 4, hintsUsed: 0, solveRank: 1 };
    const classic = computeRoundPoints(base);
    const image = computeRoundPoints({ ...base, mode: "image" });
    expect(classic - image).toBe(3 * (IMAGE_MODE.perExtraGuess - 40));
  });
});
