import { describe, expect, it } from "vitest";
import { IMAGE_MODE } from "../src/config";
import {
  MAX_ROUND_IMAGE_LEVEL,
  drawZoomCenter,
  imageEffect,
  zoomWindow,
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
      expect(effects[i]!.zoom).toBeLessThan(effects[i - 1]!.zoom);
    }
    // O primeiro nível começa ampliado; o último da rodada mostra a imagem inteira.
    expect(effects[0]!.zoom).toBeGreaterThan(1);
    expect(effects.at(-1)!.zoom).toBe(1);
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

describe("zoom do modo Imagem", () => {
  it("sorteia o ponto do zoom só nos 50% centrais", () => {
    expect(drawZoomCenter(() => 0)).toEqual({ x: 0.25, y: 0.25 });
    expect(drawZoomCenter(() => 0.999999).x).toBeCloseTo(0.75);
    for (let i = 0; i < 200; i++) {
      const { x, y } = drawZoomCenter();
      for (const v of [x, y]) {
        expect(v).toBeGreaterThanOrEqual(0.25);
        expect(v).toBeLessThanOrEqual(0.75);
      }
    }
  });

  it("a janela fica em volta do centro e nunca sai da imagem", () => {
    expect(zoomWindow(2, { x: 0.5, y: 0.5 })).toEqual({ left: 0.25, top: 0.25, size: 0.5 });
    const corner = zoomWindow(3, { x: 0.25, y: 0.75 });
    expect(corner.size).toBeCloseTo(1 / 3);
    expect(corner.left).toBeCloseTo(0.25 - 1 / 6);
    expect(corner.top + corner.size).toBeLessThanOrEqual(1);
    expect(zoomWindow(3, { x: 0, y: 1 })).toMatchObject({ left: 0, top: 1 - 1 / 3 });
  });

  it("com zoom 1 mostra a imagem inteira", () => {
    expect(zoomWindow(1, { x: 0.3, y: 0.7 })).toEqual({ left: 0, top: 0, size: 1 });
  });
});
