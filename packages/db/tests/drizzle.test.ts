/**
 * Testa o caminho "com banco" sem precisar de um Postgres instalado:
 * PGlite roda um PostgreSQL de verdade em memória (WebAssembly).
 * Aplica as migrações geradas, grava os temas e lê de volta.
 */
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { count } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Theme } from "@chutai/shared";
import * as schema from "../src/schema";
import {
  DrizzleMatchRepository,
  DrizzleThemeRepository,
  JsonThemeRepository,
  OFFICIAL_THEMES,
  upsertTheme,
  validateTheme,
  type Database,
} from "../src";

const migrationsFolder = fileURLToPath(new URL("../migrations", import.meta.url));

let db: Database;

beforeAll(async () => {
  const client = new PGlite();
  const pglite = drizzle(client, { schema });
  await migrate(pglite, { migrationsFolder });
  db = pglite as unknown as Database;
  for (const theme of OFFICIAL_THEMES) await upsertTheme(db, theme);
}, 60_000);

/** Ordena personagens e normaliza campos opcionais para comparar JSON x banco. */
function normalize(theme: Theme) {
  return {
    ...theme,
    characters: [...theme.characters]
      .map((c) => ({ ...c, aliases: c.aliases ?? [] }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
}

describe("temas oficiais", () => {
  it("estão todos consistentes", () => {
    for (const theme of OFFICIAL_THEMES) expect(validateTheme(theme), theme.slug).toEqual([]);
  });
});

describe("imagens dos temas oficiais", () => {
  const publicDir = fileURLToPath(new URL("../../../apps/web/public", import.meta.url));
  const withImage = OFFICIAL_THEMES.flatMap((theme) =>
    theme.characters.filter((c) => c.image).map((c) => ({ theme, character: c })),
  );

  it("seguem o caminho /temas/<slug>/<id>.webp e o arquivo existe", () => {
    expect(withImage.length).toBeGreaterThan(0);
    for (const { theme, character } of withImage) {
      expect(character.image).toBe(`/temas/${theme.slug}/${character.id}.webp`);
      expect(existsSync(`${publicDir}${character.image}`), character.image).toBe(true);
    }
  });

  it("cada imagem tem crédito com licença livre e link para o original", () => {
    for (const { character } of withImage) {
      const credit = character.imageCredit;
      expect(credit, character.id).toBeDefined();
      expect(credit!.license).toMatch(/^(domínio público|pd|cc0|cc by(-sa)? \d)/i);
      expect(credit!.author).not.toBe("");
      expect(credit!.source).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
    }
  });

  it("o CREDITOS.md lista todas as imagens", () => {
    const markdown = readFileSync(`${publicDir}/temas/CREDITOS.md`, "utf8");
    for (const { character } of withImage) {
      expect(markdown, character.id).toContain(character.imageCredit!.source!);
    }
  });
});

describe("validateTheme: imagens", () => {
  const base = OFFICIAL_THEMES.find((t) => t.slug === "fauna-brasileira")!;
  const withCharacter = (patch: Partial<Theme["characters"][number]>) => ({
    ...base,
    characters: [{ ...base.characters[0]!, ...patch }, ...base.characters.slice(1)],
  });

  it("aceita caminho do site e URL https de imagem", () => {
    expect(validateTheme(withCharacter({ image: "/temas/x/y.webp" }))).toEqual([]);
    expect(validateTheme(withCharacter({ image: "https://cdn.exemplo.com/a/b.png" }))).toEqual([]);
  });

  it("recusa caminhos estranhos, http, outros formatos e “..”", () => {
    for (const image of [
      "temas/x.webp",
      "//outro-site.com/x.webp",
      "http://cdn.exemplo.com/x.webp",
      "/temas/x.svg",
      "/temas/../segredo.webp",
      "/temas/x.webp?v=1",
    ]) {
      expect(validateTheme(withCharacter({ image })), image).not.toEqual([]);
    }
  });

  it("crédito precisa de autor e licença, e de uma imagem", () => {
    expect(
      validateTheme(withCharacter({ imageCredit: { author: "", license: "CC0" } })),
    ).not.toEqual([]);
    expect(
      validateTheme(
        withCharacter({ image: undefined, imageCredit: { author: "Ana", license: "CC0" } }),
      ),
    ).not.toEqual([]);
  });
});

describe("DrizzleThemeRepository", () => {
  it("lista os mesmos temas que o repositório JSON", async () => {
    const fromDb = await new DrizzleThemeRepository(db).listThemes();
    const fromJson = await new JsonThemeRepository().listThemes();
    expect(fromDb).toEqual(fromJson);
  });

  it("devolve cada tema idêntico ao JSON", async () => {
    const repo = new DrizzleThemeRepository(db);
    for (const theme of OFFICIAL_THEMES) {
      const loaded = await repo.getTheme(theme.slug);
      expect(loaded).not.toBeNull();
      expect(normalize(loaded!)).toEqual(normalize(theme));
    }
  });

  it("guarda e devolve a imagem dos personagens", async () => {
    const theme = OFFICIAL_THEMES.find((t) => t.characters.some((c) => c.image))!;
    const loaded = await new DrizzleThemeRepository(db).getTheme(theme.slug);
    const expected = theme.characters.filter((c) => c.image).length;
    expect(loaded!.characters.filter((c) => c.image)).toHaveLength(expected);
  });

  it("só a fauna tem imagem para todos os personagens (modo Imagem)", async () => {
    const summaries = await new DrizzleThemeRepository(db).listThemes();
    const available = summaries.filter((t) => t.imageModeAvailable).map((t) => t.slug);
    expect(available).toEqual(["fauna-brasileira"]);
  });

  it("rodar o seed de novo não duplica nada", async () => {
    const theme = OFFICIAL_THEMES[0]!;
    await upsertTheme(db, theme);
    const [row] = await db.select({ total: count() }).from(schema.characters);
    const expected = OFFICIAL_THEMES.reduce((sum, t) => sum + t.characters.length, 0);
    expect(row?.total).toBe(expected);
  });

  it("tema inexistente devolve null", async () => {
    expect(await new DrizzleThemeRepository(db).getTheme("nao-existe")).toBeNull();
  });
});

describe("DrizzleMatchRepository", () => {
  it("grava partida, jogadores, rodadas e palpites", async () => {
    await new DrizzleMatchRepository(db).save({
      themeSlug: "folclore-brasileiro",
      roomCode: "ABC234",
      startedAt: new Date("2026-10-19T20:00:00Z"),
      finishedAt: new Date("2026-10-19T20:10:00Z"),
      settings: {
        themeSlug: "folclore-brasileiro",
        mode: "classic",
        rounds: 1,
        roundSeconds: 90,
        hintsEnabled: true,
        maxPlayers: 8,
      },
      players: [
        { key: "p1", nickname: "Lucas", avatar: "🦜", points: 1100, position: 1 },
        { key: "p2", nickname: "Ana", avatar: "🐆", points: 0, position: 2 },
      ],
      rounds: [
        {
          number: 1,
          characterId: "saci-perere",
          guesses: [
            { playerKey: "p2", characterId: "curupira", timeMs: 4000, order: 1 },
            { playerKey: "p1", characterId: "saci-perere", timeMs: 5000, order: 1 },
          ],
        },
      ],
    });

    const [matchCount] = await db.select({ total: count() }).from(schema.matches);
    const [playerCount] = await db.select({ total: count() }).from(schema.matchPlayers);
    const [guessCount] = await db.select({ total: count() }).from(schema.guesses);
    expect(matchCount?.total).toBe(1);
    expect(playerCount?.total).toBe(2);
    expect(guessCount?.total).toBe(2);
  });
});
