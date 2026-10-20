/**
 * Tabelas do PostgreSQL, descritas com Drizzle ORM.
 *
 * O coração do sistema é o TEMA: ele define quais atributos existem
 * e cada personagem preenche esses atributos.
 * Salas e partidas em andamento ficam na memória do servidor de tempo real;
 * aqui fica o que precisa durar: temas, usuários e o histórico das partidas.
 */
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { AttributeValue, ImageCredit, RoomSettings } from "@chutai/shared";

export const visibilityEnum = pgEnum("theme_visibility", ["official", "public", "private"]);
export const moderationEnum = pgEnum("moderation_status", ["pending", "approved", "rejected"]);
export const attributeTypeEnum = pgEnum("attribute_type", ["text", "list", "number", "range"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
};

// ---------------------------------------------------------------------------
// Usuários (fase 2 — no MVP todo mundo joga como convidado)
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  email: text("email").notNull().unique(),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Temas, atributos, personagens e valores
// ---------------------------------------------------------------------------
export const themes = pgTable(
  "themes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    emoji: text("emoji").notNull().default("🎲"),
    color: text("color").notNull().default("anil"),
    creatorId: uuid("creator_id").references(() => users.id, { onDelete: "set null" }),
    /** Tema temporário criado pelo anfitrião para uma partida = visibilidade privada. */
    visibility: visibilityEnum("visibility").notNull().default("public"),
    moderationStatus: moderationEnum("moderation_status").notNull().default("pending"),
    timesPlayed: integer("times_played").notNull().default(0),
    ...timestamps,
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("themes_visibility_idx").on(table.visibility, table.moderationStatus)],
);

export const themeAttributes = pgTable(
  "theme_attributes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    themeId: uuid("theme_id")
      .notNull()
      .references(() => themes.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    /** Define como o atributo é comparado (ver AttributeType em @chutai/shared). */
    type: attributeTypeEnum("type").notNull(),
    unit: text("unit"),
    tolerance: real("tolerance"),
    toleranceIsPercent: boolean("tolerance_is_percent").notNull().default(false),
    position: integer("position").notNull().default(0),
  },
  (table) => [uniqueIndex("theme_attributes_theme_key_idx").on(table.themeId, table.key)],
);

export const characters = pgTable(
  "characters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    themeId: uuid("theme_id")
      .notNull()
      .references(() => themes.id, { onDelete: "cascade" }),
    /** Identificador legível (ex.: "saci-perere"), o mesmo usado nos JSON e pelo jogo. */
    externalId: text("external_id").notNull(),
    name: text("name").notNull(),
    /** Outros nomes aceitos no autocompletar ("CR7" → Cristiano Ronaldo). */
    aliases: text("aliases")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    emoji: text("emoji"),
    imageUrl: text("image_url"),
    /** Autor e licença da imagem (temas oficiais: Wikimedia Commons; no futuro, uploads). */
    imageCredit: jsonb("image_credit").$type<ImageCredit>(),
  },
  (table) => [uniqueIndex("characters_theme_external_idx").on(table.themeId, table.externalId)],
);

export const characterValues = pgTable(
  "character_values",
  {
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    attributeId: uuid("attribute_id")
      .notNull()
      .references(() => themeAttributes.id, { onDelete: "cascade" }),
    /** JSON para aceitar texto, número ou lista. */
    value: jsonb("value").$type<AttributeValue>().notNull(),
  },
  (table) => [primaryKey({ columns: [table.characterId, table.attributeId] })],
);

// ---------------------------------------------------------------------------
// Histórico de partidas (gravado quando a partida termina)
// ---------------------------------------------------------------------------
export const matches = pgTable("matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  themeId: uuid("theme_id")
    .notNull()
    .references(() => themes.id, { onDelete: "cascade" }),
  roomCode: text("room_code").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }).notNull(),
  settings: jsonb("settings").$type<RoomSettings>().notNull(),
});

export const matchPlayers = pgTable("match_players", {
  id: uuid("id").primaryKey().defaultRandom(),
  matchId: uuid("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  nickname: text("nickname").notNull(),
  avatar: text("avatar").notNull(),
  points: integer("points").notNull(),
  position: integer("position").notNull(),
});

export const rounds = pgTable("rounds", {
  id: uuid("id").primaryKey().defaultRandom(),
  matchId: uuid("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  number: integer("number").notNull(),
  characterId: uuid("character_id")
    .notNull()
    .references(() => characters.id, { onDelete: "cascade" }),
});

/** Útil para estatísticas ("personagem mais difícil") e para detectar trapaça. */
export const guesses = pgTable("guesses", {
  id: uuid("id").primaryKey().defaultRandom(),
  roundId: uuid("round_id")
    .notNull()
    .references(() => rounds.id, { onDelete: "cascade" }),
  matchPlayerId: uuid("match_player_id")
    .notNull()
    .references(() => matchPlayers.id, { onDelete: "cascade" }),
  characterId: uuid("character_id")
    .notNull()
    .references(() => characters.id, { onDelete: "cascade" }),
  timeMs: integer("time_ms").notNull(),
  order: integer("order").notNull(),
});

// ---------------------------------------------------------------------------
// Relações (para consultas com `db.query.*.findMany({ with: ... })`)
// ---------------------------------------------------------------------------
export const themesRelations = relations(themes, ({ many, one }) => ({
  attributes: many(themeAttributes),
  characters: many(characters),
  creator: one(users, { fields: [themes.creatorId], references: [users.id] }),
}));

export const themeAttributesRelations = relations(themeAttributes, ({ one }) => ({
  theme: one(themes, { fields: [themeAttributes.themeId], references: [themes.id] }),
}));

export const charactersRelations = relations(characters, ({ one, many }) => ({
  theme: one(themes, { fields: [characters.themeId], references: [themes.id] }),
  values: many(characterValues),
}));

export const characterValuesRelations = relations(characterValues, ({ one }) => ({
  character: one(characters, {
    fields: [characterValues.characterId],
    references: [characters.id],
  }),
  attribute: one(themeAttributes, {
    fields: [characterValues.attributeId],
    references: [themeAttributes.id],
  }),
}));
