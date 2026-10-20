/** Gera as imagens de verdade com sharp, a partir de uma imagem sintética. */
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { MAX_ROUND_IMAGE_LEVEL } from "@chutai/game";
import type { Character } from "@chutai/shared";
import { ROUND_IMAGE_SIZE, RoundImageService } from "../src/services/roundImageService";

const character: Character = {
  id: "capivara",
  name: "Capivara",
  image: "/temas/fauna-brasileira/capivara.webp",
  values: {},
};

/** Imagem com ruído (bastante detalhe) e um metadado que não pode sair do servidor. */
async function sourceImage(): Promise<Buffer> {
  return sharp({
    create: {
      width: 400,
      height: 400,
      channels: 3,
      background: "#2338d6",
      noise: { type: "gaussian", mean: 128, sigma: 60 },
    },
  })
    .withMetadata({ exif: { IFD0: { ImageDescription: "capivara" } } })
    .jpeg()
    .toBuffer();
}

/** Diferença média entre dois quadros, de 0 a 255 (usada para medir "o quanto está borrado"). */
async function distance(a: Buffer, b: Buffer): Promise<number> {
  const [ra, rb] = await Promise.all(
    [a, b].map((img) => sharp(img).removeAlpha().resize(64, 64).raw().toBuffer()),
  );
  let total = 0;
  for (let i = 0; i < ra!.length; i++) total += Math.abs(ra![i]! - rb![i]!);
  return total / ra!.length;
}

describe("RoundImageService", () => {
  it("gera um WebP 300×300 por nível, sem metadados", async () => {
    const source = await sourceImage();
    const service = new RoundImageService(
      async () => source,
      () => 0.5,
    );
    const levels = await service.render(character);
    expect(levels).toHaveLength(MAX_ROUND_IMAGE_LEVEL + 1);
    for (const level of levels) {
      const meta = await sharp(level).metadata();
      expect(meta.format).toBe("webp");
      expect([meta.width, meta.height]).toEqual([ROUND_IMAGE_SIZE, ROUND_IMAGE_SIZE]);
      expect(meta.exif).toBeUndefined();
      expect(level.includes(Buffer.from("capivara"))).toBe(false);
    }
  });

  it("cada nível tem mais detalhe que o anterior, e nenhum é a original", async () => {
    const source = await sourceImage();
    // random fixo: o disfarce é sempre o mesmo, só o nível muda.
    const service = new RoundImageService(
      async () => source,
      () => 0.99,
    );
    const levels = await service.render(character);
    const original = await sharp(source).resize(ROUND_IMAGE_SIZE, ROUND_IMAGE_SIZE).toBuffer();
    const distances = await Promise.all(levels.map((level) => distance(level, original)));
    // Com ruído puro, nenhum nível é parecido com o original: o borrado apaga o detalhe.
    for (const d of distances) expect(d).toBeGreaterThan(10);
    const sharpness = await Promise.all(
      levels.map(async (level) => (await sharp(level).stats()).channels[0]!.stdev),
    );
    for (let i = 1; i < sharpness.length; i++) {
      expect(sharpness[i]!).toBeGreaterThan(sharpness[i - 1]!);
    }
  });

  it("começa ampliado perto do centro e vai afastando o zoom", async () => {
    // Imagem branca com uma moldura preta grossa: ampliada no centro, a moldura some.
    const framed = await sharp({
      create: { width: 400, height: 400, channels: 3, background: "#000000" },
    })
      .composite([
        {
          input: await sharp({
            create: { width: 240, height: 240, channels: 3, background: "#ffffff" },
          })
            .png()
            .toBuffer(),
          left: 80,
          top: 80,
        },
      ])
      .png()
      .toBuffer();
    // random 0,5: ponto do zoom bem no centro, sem espelho e sem mudar o tom.
    const service = new RoundImageService(
      async () => framed,
      () => 0.5,
    );
    const levels = await service.render(character);
    const brightness = await Promise.all(
      levels.map(async (level) => (await sharp(level).stats()).channels[0]!.mean),
    );
    expect(brightness[0]!).toBeGreaterThan(240); // só o miolo branco
    expect(brightness.at(-1)!).toBeLessThan(200); // a imagem inteira, com a moldura
    expect(brightness[0]!).toBeGreaterThan(brightness.at(-1)!);
  });

  it("disfarça cada rodada de um jeito diferente", async () => {
    const source = await sourceImage();
    let seed = 0;
    const service = new RoundImageService(
      async () => source,
      () => (seed = (seed * 9301 + 49297) % 233280) / 233280,
    );
    const [first, second] = [await service.render(character), await service.render(character)];
    expect(Buffer.compare(first[4]!, second[4]!)).not.toBe(0);
  });

  it("baixa o original uma vez só e recusa personagem sem imagem", async () => {
    const source = await sourceImage();
    let loads = 0;
    const service = new RoundImageService(async () => {
      loads++;
      return source;
    });
    await service.render(character);
    await service.render(character);
    expect(loads).toBe(1);
    await expect(service.render({ ...character, image: undefined })).rejects.toThrow();
  });
});
