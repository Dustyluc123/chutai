import { and, asc, eq, inArray, or } from "drizzle-orm";
import type {
  AttributeType,
  Character,
  Theme,
  ThemeColor,
  ThemeSummary,
  ThemeVisibility,
} from "@chutai/shared";
import { supportsImageMode } from "@chutai/game";
import { OFFICIAL_THEMES, toThemeSummary } from "../themes";
import { characterValues, characters, themeAttributes, themes } from "../schema";
import type { Database, ThemeRepository } from "./types";

/** Usado hoje: temas vêm dos arquivos JSON em packages/db/seed. */
export class JsonThemeRepository implements ThemeRepository {
  constructor(private readonly source: readonly Theme[] = OFFICIAL_THEMES) {}

  async listThemes(): Promise<ThemeSummary[]> {
    return this.source.filter((theme) => theme.visibility !== "private").map(toThemeSummary);
  }

  async getTheme(slug: string): Promise<Theme | null> {
    return this.source.find((theme) => theme.slug === slug) ?? null;
  }
}

/**
 * Usado quando existir DATABASE_URL: lê os temas do PostgreSQL.
 * Montado e testado com PGlite (Postgres em memória) em tests/drizzle.test.ts.
 */
export class DrizzleThemeRepository implements ThemeRepository {
  constructor(private readonly db: Database) {}

  async listThemes(): Promise<ThemeSummary[]> {
    const rows = await this.db
      .select()
      .from(themes)
      .where(
        or(
          eq(themes.visibility, "official"),
          and(eq(themes.visibility, "public"), eq(themes.moderationStatus, "approved")),
        ),
      )
      .orderBy(asc(themes.createdAt));
    if (rows.length === 0) return [];

    const themeIds = rows.map((row) => row.id);
    const attributeRows = await this.db
      .select()
      .from(themeAttributes)
      .where(inArray(themeAttributes.themeId, themeIds))
      .orderBy(asc(themeAttributes.position));
    const characterRows = await this.db
      .select({ id: characters.id, themeId: characters.themeId, image: characters.imageUrl })
      .from(characters)
      .where(inArray(characters.themeId, themeIds));

    return rows.map((row) => {
      const themeCharacters = characterRows
        .filter((c) => c.themeId === row.id)
        .map((c) => ({ image: c.image ?? undefined }));
      return {
        slug: row.slug,
        name: row.name,
        description: row.description,
        emoji: row.emoji,
        color: row.color as ThemeColor,
        visibility: row.visibility as ThemeVisibility,
        characterCount: themeCharacters.length,
        imageModeAvailable: supportsImageMode(themeCharacters),
        attributes: attributeRows
          .filter((attr) => attr.themeId === row.id)
          .map((attr) => ({ key: attr.key, label: attr.label })),
      };
    });
  }

  async getTheme(slug: string): Promise<Theme | null> {
    const [row] = await this.db.select().from(themes).where(eq(themes.slug, slug)).limit(1);
    if (!row) return null;

    const attributeRows = await this.db
      .select()
      .from(themeAttributes)
      .where(eq(themeAttributes.themeId, row.id))
      .orderBy(asc(themeAttributes.position));
    const characterRows = await this.db
      .select()
      .from(characters)
      .where(eq(characters.themeId, row.id))
      .orderBy(asc(characters.name));
    const valueRows = characterRows.length
      ? await this.db
          .select()
          .from(characterValues)
          .where(
            inArray(
              characterValues.characterId,
              characterRows.map((c) => c.id),
            ),
          )
      : [];

    const keyByAttributeId = new Map(attributeRows.map((attr) => [attr.id, attr.key]));

    return {
      slug: row.slug,
      name: row.name,
      description: row.description,
      emoji: row.emoji,
      color: row.color as ThemeColor,
      visibility: row.visibility as ThemeVisibility,
      attributes: attributeRows.map((attr) => ({
        key: attr.key,
        label: attr.label,
        type: attr.type as AttributeType,
        ...(attr.unit ? { unit: attr.unit } : {}),
        ...(attr.tolerance !== null
          ? { tolerance: attr.tolerance, toleranceIsPercent: attr.toleranceIsPercent }
          : {}),
      })),
      characters: characterRows.map<Character>((character) => ({
        id: character.externalId,
        name: character.name,
        aliases: character.aliases,
        ...(character.emoji ? { emoji: character.emoji } : {}),
        ...(character.imageUrl ? { image: character.imageUrl } : {}),
        ...(character.imageCredit ? { imageCredit: character.imageCredit } : {}),
        values: Object.fromEntries(
          valueRows
            .filter((value) => value.characterId === character.id)
            .map((value) => [keyByAttributeId.get(value.attributeId) ?? "", value.value]),
        ),
      })),
    };
  }
}

/**
 * Grava (ou atualiza) um tema completo no banco. Usado pelo seed e,
 * no futuro, pelo editor de temas da comunidade.
 */
export async function upsertTheme(db: Database, theme: Theme): Promise<void> {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(themes)
      .values({
        slug: theme.slug,
        name: theme.name,
        description: theme.description,
        emoji: theme.emoji,
        color: theme.color,
        visibility: theme.visibility,
        moderationStatus: theme.visibility === "official" ? "approved" : "pending",
      })
      .onConflictDoUpdate({
        target: themes.slug,
        set: {
          name: theme.name,
          description: theme.description,
          emoji: theme.emoji,
          color: theme.color,
          visibility: theme.visibility,
        },
      })
      .returning({ id: themes.id });
    if (!row) throw new Error(`Não foi possível gravar o tema ${theme.slug}.`);

    // Mais simples e seguro: apaga atributos/personagens antigos e grava de novo.
    await tx.delete(characters).where(eq(characters.themeId, row.id));
    await tx.delete(themeAttributes).where(eq(themeAttributes.themeId, row.id));

    const attributeRows = await tx
      .insert(themeAttributes)
      .values(
        theme.attributes.map((attr, position) => ({
          themeId: row.id,
          key: attr.key,
          label: attr.label,
          type: attr.type,
          unit: attr.unit ?? null,
          tolerance: attr.tolerance ?? null,
          toleranceIsPercent: attr.toleranceIsPercent ?? false,
          position,
        })),
      )
      .returning({ id: themeAttributes.id, key: themeAttributes.key });
    const attributeIdByKey = new Map(attributeRows.map((attr) => [attr.key, attr.id]));

    const characterRows = await tx
      .insert(characters)
      .values(
        theme.characters.map((character) => ({
          themeId: row.id,
          externalId: character.id,
          name: character.name,
          aliases: character.aliases ?? [],
          emoji: character.emoji ?? null,
          imageUrl: character.image ?? null,
          imageCredit: character.imageCredit ?? null,
        })),
      )
      .returning({ id: characters.id, externalId: characters.externalId });
    const characterIdByExternal = new Map(characterRows.map((c) => [c.externalId, c.id]));

    const values = theme.characters.flatMap((character) =>
      Object.entries(character.values).flatMap(([key, value]) => {
        const attributeId = attributeIdByKey.get(key);
        const characterId = characterIdByExternal.get(character.id);
        return attributeId && characterId ? [{ characterId, attributeId, value }] : [];
      }),
    );
    if (values.length) await tx.insert(characterValues).values(values);
  });
}
