/** Gera as imagens de verdade com sharp, a partir de uma imagem sintética. */
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { MAX_ROUND_IMAGE_LEVEL } from "@chutai/game";
import type { Character } from "@chutai/shared";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../src/config";
import {
  ROUND_IMAGE_SIZE,
  RoundImageService,
  diskImageLoader,
  seededRandom,
} from "../src/services/roundImageService";

const character: Character = {
  id: "capivara",
  name: "Capivara",
  image: "/temas/fauna-brasileira/capivara.webp",
  values: {},
};

/**
 * Imagem com ruído (bastante detalhe) e um metadado que não pode sair do servidor. O ruído vem de
 * uma semente fixa: a mesma imagem em toda execução (o ruído do próprio sharp muda a cada vez).
 */
async function sourceImage(seed = 2024): Promise<Buffer> {
  const random = seededRandom(seed);
  const pixels = Buffer.alloc(400 * 400 * 3);
  for (let i = 0; i < pixels.length; i++) pixels[i] = Math.floor(random() * 256);
  return sharp(pixels, { raw: { width: 400, height: 400, channels: 3 } })
    .withMetadata({ exif: { IFD0: { ImageDescription: "capivara" } } })
    .jpeg()
    .toBuffer();
}

/**
 * Quanto detalhe uma imagem mostra: diferença média entre pixels vizinhos (bordas). Blocos menores
 * e menos desfoque dão mais bordas. Medida em imagens reais: em ruído puro, a média de cada bloco
 * apaga quase tudo e a diferença entre níveis vizinhos fica no limite do acaso.
 */
async function detail(image: Buffer): Promise<number> {
  const { data, info } = await sharp(image).greyscale().raw().toBuffer({ resolveWithObject: true });
  let total = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 1; x < info.width; x++) {
      total += Math.abs(data[y * info.width + x]! - data[y * info.width + x - 1]!);
    }
  }
  return total / (info.height * (info.width - 1));
}

const publicDir = fileURLToPath(new URL("../../web/public", import.meta.url));
/** Imagens reais de temas (fotos e ilustração), para medir o detalhe como no jogo. */
const REAL_IMAGES = [
  "/temas/fauna-brasileira/capivara.webp",
  "/temas/fauna-brasileira/arara-azul.webp",
  "/temas/fauna-brasileira/anta.webp",
];
/** Sementes do disfarce testadas. Para conferir mais: IMAGE_TEST_SEEDS=50 pnpm test. */
const SEEDS = Array.from(
  { length: Number(process.env.IMAGE_TEST_SEEDS ?? 5) },
  (_, i) => 101 + i * 7919,
);

/**
 * Diferença média entre dois quadros, de 0 a 255, no tamanho real da rodada (reduzir antes
 * apagaria o ruído e deixaria as duas imagens parecidas por acaso).
 */
async function distance(a: Buffer, b: Buffer): Promise<number> {
  const [ra, rb] = await Promise.all(
    [a, b].map((img) =>
      sharp(img).removeAlpha().resize(ROUND_IMAGE_SIZE, ROUND_IMAGE_SIZE).raw().toBuffer(),
    ),
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

  it("nenhum nível é a original", async () => {
    const source = await sourceImage();
    const service = new RoundImageService(async () => source);
    const levels = await service.render(character, 7);
    const original = await sharp(source).resize(ROUND_IMAGE_SIZE, ROUND_IMAGE_SIZE).toBuffer();
    const distances = await Promise.all(levels.map((level) => distance(level, original)));
    // Com ruído puro, nenhum nível é parecido com o original: o borrado apaga o detalhe.
    // (Medido: ~30 em todos os níveis; o limite é 10.)
    for (const d of distances) expect(d).toBeGreaterThan(10);
  });

  it.each(REAL_IMAGES)(
    "cada nível tem mais detalhe que o anterior (%s)",
    async (image) => {
      const source = await readFile(publicDir + image);
      const service = new RoundImageService(async () => source);
      for (const seed of SEEDS) {
        const levels = await service.render({ ...character, image }, seed);
        const details = await Promise.all(levels.map(detail));
        for (let i = 1; i < details.length; i++) {
          // Folga grande: medindo 10 imagens reais × 20 sementes (e estas 3 × 50), o menor ganho
          // de um nível para o seguinte foi de 11%.
          expect(
            details[i]! / details[i - 1]!,
            `semente ${seed}, nível ${i}: ${details.map((d) => d.toFixed(2)).join(" → ")}`,
          ).toBeGreaterThan(1.03);
        }
      }
    },
    5_000 + SEEDS.length * 1_500,
  );

  it("a mesma semente gera exatamente as mesmas imagens", async () => {
    const source = await readFile(publicDir + REAL_IMAGES[0]);
    const service = new RoundImageService(async () => source);
    const [a, b] = [await service.render(character, 42), await service.render(character, 42)];
    a.forEach((level, i) => expect(Buffer.compare(level, b[i]!)).toBe(0));
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

describe("diskImageLoader", () => {
  const { assetsDir } = loadConfig({});
  const fallback = async (image: string) => Buffer.from(`http:${image}`);
  const load = diskImageLoader(assetsDir, fallback);

  it("a pasta padrão aponta para as imagens do site", () => {
    expect(existsSync(`${assetsDir}/temas/fauna-brasileira/capivara.webp`)).toBe(true);
  });

  it("lê do disco as imagens dos temas oficiais", async () => {
    const bytes = await load("/temas/fauna-brasileira/capivara.webp");
    expect((await sharp(bytes).metadata()).format).toBe("webp");
  });

  it("o que não está no disco, e URLs completas, vão para a busca por HTTP", async () => {
    expect((await load("/temas/nao-existe.webp")).toString()).toBe("http:/temas/nao-existe.webp");
    expect((await load("https://cdn.exemplo.com/a.webp")).toString()).toBe(
      "http:https://cdn.exemplo.com/a.webp",
    );
  });

  it("nunca lê fora da pasta de imagens", async () => {
    await expect(load("/../../package.json")).rejects.toThrow("inválido");
  });
});
