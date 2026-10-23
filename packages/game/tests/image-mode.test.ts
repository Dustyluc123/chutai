import { describe, expect, it } from "vitest";
import { IMAGE_MODE } from "../src/config";
import {
  MAX_ROUND_IMAGE_LEVEL,
  drawZoomCenter,
  imageEffect,
  zoomWindow,
  imageLevel,
  imageModeAvailability,
  imageModeCharacters,
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

  it("cada nível revela mais que o anterior, qualquer que seja o sorteio do disfarce", () => {
    const effects = Array.from({ length: MAX_ROUND_IMAGE_LEVEL + 1 }, (_, level) =>
      imageEffect(level),
    );
    // Tamanho de um bloco na imagem final (fração da largura): sempre menor que o anterior.
    const block = effects.map(({ zoom, pixels }) => 1 / (zoom * pixels));
    for (let i = 1; i < block.length; i++) expect(block[i]!).toBeLessThan(block[i - 1]!);

    // A janela de cada nível contém a do anterior: o que já apareceu nunca sai de vista.
    let seed = 12345;
    const random = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    for (let n = 0; n < 2000; n++) {
      const center = drawZoomCenter(random);
      for (let i = 1; i < effects.length; i++) {
        const before = zoomWindow(effects[i - 1]!.zoom, center);
        const after = zoomWindow(effects[i]!.zoom, center);
        const eps = 1e-12;
        expect(after.left).toBeLessThanOrEqual(before.left + eps);
        expect(after.top).toBeLessThanOrEqual(before.top + eps);
        expect(after.left + after.size).toBeGreaterThanOrEqual(before.left + before.size - eps);
        expect(after.top + after.size).toBeGreaterThanOrEqual(before.top + before.size - eps);
      }
    }
  });

  it("recusa o nível nítido e níveis inventados", () => {
    expect(() => imageEffect(MAX_ROUND_IMAGE_LEVEL + 1)).toThrow();
    expect(() => imageEffect(-1)).toThrow();
    expect(() => imageEffect(1.5)).toThrow();
  });
});

/** Tema de mentira com `withImage` personagens com imagem e `without` sem. */
const fakeTheme = (withImage: number, without: number) => [
  ...Array.from({ length: withImage }, (_, i) => ({ image: `/t/${i}.webp` })),
  ...Array.from({ length: without }, () => ({})),
];

describe("imageModeAvailability", () => {
  it("100% com imagem: modo Imagem normal", () => {
    expect(imageModeAvailability(fakeTheme(40, 0))).toBe("full");
  });

  it("de 75% a 99%: modo Imagem parcial", () => {
    expect(imageModeAvailability(fakeTheme(30, 10))).toBe("partial"); // 75% exatos
    expect(imageModeAvailability(fakeTheme(47, 2))).toBe("partial");
  });

  it("abaixo de 75%: indisponível", () => {
    expect(imageModeAvailability(fakeTheme(29, 11))).toBe("none");
    expect(imageModeAvailability(fakeTheme(16, 8))).toBe("none");
  });

  it("precisa de pelo menos 10 personagens com imagem, mesmo com 100%", () => {
    expect(imageModeAvailability(fakeTheme(9, 0))).toBe("none");
    expect(imageModeAvailability(fakeTheme(10, 0))).toBe("full");
    expect(imageModeAvailability(fakeTheme(9, 1))).toBe("none");
  });

  it("tema vazio não tem modo Imagem", () => {
    expect(imageModeAvailability([])).toBe("none");
    expect(supportsImageMode([])).toBe(false);
  });

  it("supportsImageMode aceita o normal e o parcial", () => {
    expect(supportsImageMode(fakeTheme(40, 0))).toBe(true);
    expect(supportsImageMode(fakeTheme(36, 4))).toBe(true);
    expect(supportsImageMode(fakeTheme(20, 20))).toBe(false);
  });

  it("no modo Imagem só entram os personagens com imagem", () => {
    expect(imageModeCharacters(fakeTheme(3, 2))).toHaveLength(3);
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
