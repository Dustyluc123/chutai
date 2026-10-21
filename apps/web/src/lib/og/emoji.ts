import "server-only";

/**
 * Emojis nas imagens geradas. A fonte das imagens não tem emojis, então cada um vira um <img>
 * do Twemoji (desenhos SVG numa CDN). Se a CDN falhar ou demorar, o emoji simplesmente não
 * aparece: a imagem sai do mesmo jeito, sem erro.
 *
 * Nunca colocamos o emoji como texto no ImageResponse: ele tentaria baixar da CDN por conta
 * própria e, se falhasse, a imagem inteira daria erro.
 */
const TWEMOJI = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg";

/** Nome do arquivo no Twemoji: código de cada caractere em hexa, sem o seletor FE0F (salvo em sequências com ZWJ). */
export function twemojiCode(emoji: string): string {
  const points = [...emoji].map((char) => char.codePointAt(0)!.toString(16));
  const hasZwj = points.includes("200d");
  return points.filter((point) => hasZwj || point !== "fe0f").join("-");
}

const cache = new Map<string, Promise<string | null>>();

/** O emoji como data URI (SVG) ou null se não deu para baixar a tempo. */
export function emojiDataUri(emoji: string, timeoutMs = 1500): Promise<string | null> {
  const code = twemojiCode(emoji.trim());
  if (!code) return Promise.resolve(null);
  const cached = cache.get(code);
  if (cached) return cached;
  const job = fetch(`${TWEMOJI}/${code}.svg`, { signal: AbortSignal.timeout(timeoutMs) })
    .then(async (response) => {
      if (!response.ok) throw new Error(`Twemoji respondeu ${response.status}`);
      const svg = await response.text();
      return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    })
    .catch(() => {
      cache.delete(code); // tenta de novo na próxima imagem
      return null;
    });
  cache.set(code, job);
  return job;
}

/** Várias de uma vez, na mesma ordem. */
export function emojiDataUris(emojis: string[]): Promise<(string | null)[]> {
  return Promise.all(emojis.map((emoji) => emojiDataUri(emoji)));
}

/**
 * Tira do texto o que a fonte das imagens não desenha (emojis, outros alfabetos), para o
 * ImageResponse não tentar baixar fontes extras. Se não sobrar nada, usa `fallback`.
 */
export function ogText(text: string, fallback: string): string {
  const clean = text
    .replace(/[^ -ɏ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return clean || fallback;
}
