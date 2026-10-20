import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Fontes das imagens geradas (prévia do link, pódio). O ImageResponse não aceita a Archivo
 * variável em woff2 que o site usa, então usamos duas versões fixas em TTF (licença OFL,
 * em src/assets/og): a larga e bem pesada dos títulos e a semibold do texto.
 */
export const DISPLAY = "Archivo Display";
export const TEXT = "Archivo";

type OgFont = { name: string; data: ArrayBuffer; weight: 600 | 900; style: "normal" };

let loaded: Promise<OgFont[]> | undefined;

async function load(file: string): Promise<ArrayBuffer> {
  const buffer = await readFile(path.join(process.cwd(), "src/assets/og", file));
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

export function ogFonts(): Promise<OgFont[]> {
  loaded ??= Promise.all([load("archivo-expanded-black.ttf"), load("archivo-semibold.ttf")]).then(
    ([display, text]) => [
      { name: DISPLAY, data: display, weight: 900, style: "normal" },
      { name: TEXT, data: text, weight: 600, style: "normal" },
    ],
  );
  return loaded;
}
