/**
 * Baixa as imagens dos temas oficiais do Wikimedia Commons e registra os créditos.
 *
 *   pnpm images:fetch
 *
 * O que faz:
 * 1. Lê `seed/image-sources.json` (qual arquivo do Commons usar para cada personagem).
 * 2. Confere a licença de cada arquivo na API do Commons. Só aceita domínio público,
 *    CC0, CC BY e CC BY-SA; qualquer outra licença faz o personagem ficar sem imagem.
 * 3. Recorta e reduz para 300×300 em WebP e grava em `apps/web/public/temas/<slug>/<id>.webp`.
 * 4. Atualiza os campos `image` e `imageCredit` de cada personagem nos JSON dos temas
 *    (a página /creditos lê dali) e gera `apps/web/public/temas/CREDITOS.md`.
 *
 * Precisa de internet. Rodar de novo é seguro: tudo é regravado a partir do manifesto.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import type { ImageCredit } from "@chutai/shared";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const SEED_DIR = `${ROOT}packages/db/seed`;
const PUBLIC_DIR = `${ROOT}apps/web/public/temas`;
const CACHE_DIR = `${ROOT}packages/db/.cache/images`;
const USER_AGENT = "chutai/0.1 (https://github.com/Dustyluc123/chutai)";

/** Tamanho final das imagens (quadradas). */
export const IMAGE_SIZE = 300;

/** Licenças aceitas, pelo nome curto que o Commons usa. */
const ALLOWED = [/^public domain$/i, /^pd/i, /^cc0/i, /^cc by(-sa)? \d/i];

/** Uma linha do CREDITOS.md. */
interface CreditRow extends ImageCredit {
  theme: string;
  characterId: string;
  characterName: string;
  /** Caminho no site, igual ao campo `image` do personagem. */
  image: string;
  /** Título do arquivo no Commons. */
  file: string;
  source: string;
}

type Manifest = Record<string, Record<string, string>>;

interface CommonsInfo {
  title: string;
  imageinfo?: {
    descriptionurl: string;
    thumburl?: string;
    url: string;
    extmetadata?: Record<string, { value: string } | undefined>;
  }[];
}

const stripHtml = (value: string | undefined) =>
  (value ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

function cleanAuthor(raw: string): string {
  const text = stripHtml(raw);
  if (!text || /unknown/i.test(text)) return "Autor desconhecido";
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

async function commonsInfo(files: string[]): Promise<Map<string, CommonsInfo>> {
  const result = new Map<string, CommonsInfo>();
  for (let i = 0; i < files.length; i += 40) {
    const chunk = files.slice(i, i + 40);
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      // 960 é um dos tamanhos de miniatura padrão do Commons.
      iiurlwidth: "960",
      titles: chunk.join("|"),
    });
    const response = await politeFetch(`https://commons.wikimedia.org/w/api.php?${params}`);
    const data = (await response.json()) as {
      query: { normalized?: { from: string; to: string }[]; pages: Record<string, CommonsInfo> };
    };
    const normalized = new Map(data.query.normalized?.map((n) => [n.to, n.from]) ?? []);
    for (const page of Object.values(data.query.pages)) {
      result.set(normalized.get(page.title) ?? page.title, page);
    }
  }
  return result;
}

/**
 * Como recortar o quadrado. Fotos de pessoas: a partir do topo, para não cortar o rosto.
 * O resto: a região que o sharp considera mais "interessante".
 */
const CROP_POSITION: Record<string, string | number> = {
  "lendas-do-futebol": "top",
  "musica-brasileira": "top",
  "futebol-atual": "top",
  "youtubers-e-streamers": "top",
  "famosos-da-tv": "top",
  "historia-do-brasil": "top",
};

/** Temas em que a imagem entra inteira no quadrado (bandeiras), com faixas brancas, sem cortar. */
const CONTAIN = new Set(["estados-do-brasil"]);

/** Recorta para quadrado e converte para WebP. */
async function toWebp(bytes: Buffer, slug: string): Promise<Buffer> {
  return (
    sharp(bytes)
      .rotate()
      .resize(IMAGE_SIZE, IMAGE_SIZE, {
        fit: CONTAIN.has(slug) ? "contain" : "cover",
        position: CONTAIN.has(slug) ? "centre" : (CROP_POSITION[slug] ?? sharp.strategy.attention),
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      // Só as bandeiras ganham fundo branco; as outras imagens ficam como sempre foram.
      .flatten(CONTAIN.has(slug) ? { background: "#ffffff" } : false)
      .webp({ quality: 74, effort: 6 })
      .toBuffer()
  );
}

/**
 * Coloca (ou tira) os campos `image` e `imageCredit` de cada personagem sem reformatar
 * o resto do JSON, que segue o estilo compacto escrito à mão.
 */
function setImageFields(
  json: string,
  images: Map<string, { image: string; credit: ImageCredit }>,
): string {
  const lines: string[] = [];
  let skippingCredit = false;
  for (const line of json.split("\n")) {
    if (skippingCredit) {
      if (/^\s*\},?$/.test(line)) skippingCredit = false;
      continue;
    }
    if (/^\s*"imageCredit": \{$/.test(line)) {
      skippingCredit = true;
      continue;
    }
    if (/^\s*"image": /.test(line)) continue;
    lines.push(line);
  }

  const out: string[] = [];
  let currentId: string | undefined;
  for (const line of lines) {
    out.push(line);
    const id = /^\s*"id": "([^"]+)",?$/.exec(line);
    if (id) currentId = id[1];
    const name = /^(\s*)"name": /.exec(line);
    const entry = currentId ? images.get(currentId) : undefined;
    if (name && entry) {
      const indent = name[1] ?? "";
      out.push(`${indent}"image": ${JSON.stringify(entry.image)},`);
      const credit = JSON.stringify(entry.credit, null, 2).split("\n");
      credit.forEach((creditLine, index) => {
        const prefix = index === 0 ? `${indent}"imageCredit": ` : indent;
        out.push(`${prefix}${creditLine}${index === credit.length - 1 ? "," : ""}`);
      });
      currentId = undefined;
    }
  }
  return out.join("\n");
}

function creditsMarkdown(credits: CreditRow[]): string {
  const escape = (text: string) => text.replace(/\|/g, "\\|");
  const sections = [...new Set(credits.map((c) => c.theme))].map((theme) => {
    const rows = credits
      .filter((c) => c.theme === theme)
      .map(
        (c) =>
          `| ${escape(c.characterName)} | ${escape(c.author)} | ${
            c.licenseUrl ? `[${c.license}](${c.licenseUrl})` : c.license
          } | [${escape(c.file.replace(/^File:/, ""))}](${c.source}) |`,
      );
    return [
      `## ${theme}`,
      "",
      "| Personagem | Autor | Licença | Arquivo original |",
      "| --- | --- | --- | --- |",
      ...rows,
    ].join("\n");
  });
  return [
    "# Créditos das imagens",
    "",
    "Todas as imagens vêm do [Wikimedia Commons](https://commons.wikimedia.org) e têm licença livre",
    "(domínio público, CC0, CC BY ou CC BY-SA). Foram recortadas e reduzidas para 300×300 pixels.",
    "As versões modificadas seguem a mesma licença da original.",
    "",
    "Arquivo gerado por `pnpm images:fetch` (não edite à mão).",
    "",
    ...sections.flatMap((section) => [section, ""]),
  ].join("\n");
}

/** Espera `ms` milissegundos. */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * `fetch` educado com a Wikimedia: identifica o projeto e, se ela pedir para ir mais devagar
 * (429/503), espera e tenta de novo. Depois de 6 tentativas desiste com erro.
 */
async function politeFetch(url: string): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (response.ok) return response;
    if ((response.status !== 429 && response.status !== 503) || attempt >= 6) {
      throw new Error(`${response.status} ao baixar ${url}`);
    }
    const retryAfter = Number(response.headers.get("retry-after"));
    const waitMs =
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 1000;
    console.log(`... a Wikimedia pediu calma (${response.status}), esperando ${waitMs / 1000}s`);
    await sleep(waitMs);
  }
}

/**
 * Baixa o original uma vez e guarda em `.cache/` (fora do git). Rodar o script de novo
 * só baixa o que mudou no manifesto.
 */
async function downloadOriginal(url: string, file: string): Promise<Buffer> {
  const cachePath = `${CACHE_DIR}/${createHash("sha1").update(file).digest("hex")}`;
  try {
    return await readFile(cachePath);
  } catch {
    const bytes = Buffer.from(await (await politeFetch(url)).arrayBuffer());
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(cachePath, bytes);
    await sleep(500);
    return bytes;
  }
}

interface ThemeResult {
  slug: string;
  themePath: string;
  themeJson: string;
  images: Map<string, { image: string; credit: ImageCredit }>;
  files: Map<string, Buffer>;
}

async function main() {
  const manifest = JSON.parse(await readFile(`${SEED_DIR}/image-sources.json`, "utf8")) as Manifest;
  const credits: CreditRow[] = [];
  const missing: string[] = [];
  const results: ThemeResult[] = [];

  // 1. Baixa e converte tudo na memória. Se algo falhar, nada no disco é alterado.
  for (const [slug, entries] of Object.entries(manifest)) {
    const themePath = `${SEED_DIR}/${slug}.json`;
    const themeJson = await readFile(themePath, "utf8");
    const theme = JSON.parse(themeJson) as {
      name: string;
      characters: { id: string; name: string }[];
    };
    const info = await commonsInfo(Object.values(entries));
    const result: ThemeResult = { slug, themePath, themeJson, images: new Map(), files: new Map() };

    for (const character of theme.characters) {
      const file = entries[character.id];
      if (!file) {
        missing.push(`${theme.name}: ${character.name} (sem imagem livre no manifesto)`);
        continue;
      }
      const page = info.get(file);
      const image = page?.imageinfo?.[0];
      const meta = image?.extmetadata ?? {};
      const license = stripHtml(meta.LicenseShortName?.value);
      if (!page || !image || !ALLOWED.some((pattern) => pattern.test(license))) {
        missing.push(`${theme.name}: ${character.name} (licença "${license || "?"}" não aceita)`);
        continue;
      }

      const original = await downloadOriginal(image.thumburl ?? image.url, file);
      const path = `/temas/${slug}/${character.id}.webp`;
      result.files.set(`${character.id}.webp`, await toWebp(original, slug));

      const licenseUrl = stripHtml(meta.LicenseUrl?.value);
      const credit: ImageCredit = {
        author: cleanAuthor(meta.Artist?.value ?? ""),
        license: /^public domain$/i.test(license) ? "Domínio público" : license,
        ...(licenseUrl ? { licenseUrl } : {}),
        source: image.descriptionurl,
      };
      result.images.set(character.id, { image: path, credit });
      credits.push({
        ...credit,
        theme: theme.name,
        characterId: character.id,
        characterName: character.name,
        image: path,
        file: page.title,
        source: image.descriptionurl,
      });
      console.log(`ok  ${slug}/${character.id} (${license})`);
    }
    results.push(result);
  }

  // 2. Grava imagens, campos `image` dos temas e créditos.
  for (const result of results) {
    const dir = `${PUBLIC_DIR}/${result.slug}`;
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    for (const [name, bytes] of result.files) await writeFile(`${dir}/${name}`, bytes);
    await writeFile(result.themePath, setImageFields(result.themeJson, result.images));
  }
  await writeFile(`${PUBLIC_DIR}/CREDITOS.md`, creditsMarkdown(credits));

  console.log(`\n${credits.length} imagens gravadas.`);
  if (missing.length) console.log(`Sem imagem (${missing.length}):\n- ${missing.join("\n- ")}`);
  console.log("Rode `pnpm format` para alinhar as tabelas do CREDITOS.md.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
