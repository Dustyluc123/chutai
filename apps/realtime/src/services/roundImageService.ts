/**
 * Gera, para cada rodada do modo Imagem, as versões degradadas da imagem secreta.
 *
 * Por que no servidor: borrar com CSS não protege nada, porque o navegador teria a imagem
 * nítida (e a URL dela, que contém o id do personagem). Aqui o navegador só recebe bytes
 * já degradados, sem nome de arquivo nem metadados.
 *
 * A cada rodada a imagem também passa por uma transformação aleatória (espelho, recorte,
 * tom) e começa ampliada num ponto sorteado perto do centro, afastando o zoom a cada nível.
 * Assim fica difícil achar o personagem comparando com a galeria pública do tema.
 */
import sharp from "sharp";
import type { Character } from "@chutai/shared";
import {
  MAX_ROUND_IMAGE_LEVEL,
  drawZoomCenter,
  imageEffect,
  zoomWindow,
  type Random,
} from "@chutai/game";

/** Lado (em pixels) das imagens entregues ao navegador. */
export const ROUND_IMAGE_SIZE = 300;

/** Como buscar os bytes da imagem original a partir do campo `image` do personagem. */
export type ImageLoader = (image: string) => Promise<Buffer>;

const MAX_ORIGINAL_BYTES = 5 * 1024 * 1024;

/**
 * Busca a imagem por HTTP. Caminhos relativos ("/temas/...") são resolvidos a partir do site
 * (ASSETS_BASE_URL); URLs completas (temas da comunidade, no futuro) são usadas como estão.
 */
export function httpImageLoader(baseUrl: string): ImageLoader {
  return async (image) => {
    const url = new URL(image, baseUrl);
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`Imagem ${url.pathname} respondeu ${response.status}.`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > MAX_ORIGINAL_BYTES) throw new Error(`Imagem ${url.pathname} grande demais.`);
    return bytes;
  };
}

export class RoundImageService {
  /** Originais já baixados, por endereço (os temas mudam pouco). */
  private readonly originals = new Map<string, Promise<Buffer>>();

  constructor(
    private readonly load: ImageLoader,
    private readonly random: Random = Math.random,
    private readonly cacheSize = 128,
  ) {}

  /** Devolve um buffer por nível, do 0 (o mais borrado) até MAX_ROUND_IMAGE_LEVEL. */
  async render(character: Character): Promise<Buffer[]> {
    if (!character.image) throw new Error(`${character.id} não tem imagem.`);
    const base = await this.disguise(await this.original(character.image));
    // O mesmo ponto em todos os níveis: dá a sensação de "afastar a câmera".
    const center = drawZoomCenter(this.random);
    const levels: Buffer[] = [];
    for (let level = 0; level <= MAX_ROUND_IMAGE_LEVEL; level++) {
      const { zoom, pixels, blur } = imageEffect(level);
      const window = zoomWindow(zoom, center);
      const size = Math.max(1, Math.round(window.size * ROUND_IMAGE_SIZE));
      const zoomed = await sharp(base)
        .extract({
          left: Math.min(ROUND_IMAGE_SIZE - size, Math.round(window.left * ROUND_IMAGE_SIZE)),
          top: Math.min(ROUND_IMAGE_SIZE - size, Math.round(window.top * ROUND_IMAGE_SIZE)),
          width: size,
          height: size,
        })
        .toBuffer();
      // Reduz (vira blocos), amplia sem suavizar e desfoca por cima.
      const small = await sharp(zoomed).resize(pixels, pixels, { fit: "fill" }).toBuffer();
      levels.push(
        await sharp(small)
          .resize(ROUND_IMAGE_SIZE, ROUND_IMAGE_SIZE, { kernel: "nearest" })
          .blur(Math.max(0.3, blur))
          .webp({ quality: 70 })
          .toBuffer(),
      );
    }
    return levels;
  }

  private original(image: string): Promise<Buffer> {
    const cached = this.originals.get(image);
    if (cached) return cached;
    const loading = this.load(image);
    loading.catch(() => this.originals.delete(image));
    if (this.originals.size >= this.cacheSize) {
      const oldest = this.originals.keys().next().value;
      if (oldest !== undefined) this.originals.delete(oldest);
    }
    this.originals.set(image, loading);
    return loading;
  }

  /** Quadrado com espelho, recorte e tom sorteados, em PNG sem metadados. */
  private async disguise(original: Buffer): Promise<Buffer> {
    const size = ROUND_IMAGE_SIZE;
    const square = await sharp(original).rotate().resize(size, size, { fit: "cover" }).toBuffer();

    const crop = Math.round(size * (0.82 + this.random() * 0.18));
    const left = Math.floor(this.random() * (size - crop + 1));
    const top = Math.floor(this.random() * (size - crop + 1));
    let pipeline = sharp(square)
      .extract({ left, top, width: crop, height: crop })
      .resize(size, size)
      .modulate({
        hue: Math.round((this.random() - 0.5) * 40),
        brightness: 0.92 + this.random() * 0.16,
      });
    if (this.random() < 0.5) pipeline = pipeline.flop();
    return pipeline.png().toBuffer();
  }
}
