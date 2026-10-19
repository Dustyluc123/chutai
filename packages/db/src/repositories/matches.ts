import { and, eq, inArray } from "drizzle-orm";
import { characters, guesses, matchPlayers, matches, rounds, themes } from "../schema";
import type { Database, MatchRecord, MatchRepository } from "./types";

/**
 * Usado hoje: guarda as últimas partidas só na memória do processo
 * (somem quando o servidor reinicia). Bom para desenvolvimento.
 */
export class MemoryMatchRepository implements MatchRepository {
  readonly records: MatchRecord[] = [];

  constructor(private readonly limit = 100) {}

  async save(record: MatchRecord): Promise<void> {
    this.records.push(record);
    if (this.records.length > this.limit) this.records.shift();
  }
}

/** Usado quando existir DATABASE_URL: grava o histórico completo da partida. */
export class DrizzleMatchRepository implements MatchRepository {
  constructor(private readonly db: Database) {}

  async save(record: MatchRecord): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [theme] = await tx
        .select({ id: themes.id })
        .from(themes)
        .where(eq(themes.slug, record.themeSlug))
        .limit(1);
      if (!theme) return; // tema não está no banco (ex.: tema temporário): nada a gravar

      const [match] = await tx
        .insert(matches)
        .values({
          themeId: theme.id,
          roomCode: record.roomCode,
          startedAt: record.startedAt,
          finishedAt: record.finishedAt,
          settings: record.settings,
        })
        .returning({ id: matches.id });
      if (!match) return;

      const playerRows = record.players.length
        ? await tx
            .insert(matchPlayers)
            .values(
              record.players.map((player) => ({
                matchId: match.id,
                nickname: player.nickname,
                avatar: player.avatar,
                points: player.points,
                position: player.position,
              })),
            )
            .returning({ id: matchPlayers.id })
        : [];
      const playerIdByKey = new Map(
        record.players.map((player, index) => [player.key, playerRows[index]?.id]),
      );

      const externalIds = [
        ...new Set(
          record.rounds.flatMap((round) => [
            round.characterId,
            ...round.guesses.map((guess) => guess.characterId),
          ]),
        ),
      ];
      const characterRows = externalIds.length
        ? await tx
            .select({ id: characters.id, externalId: characters.externalId })
            .from(characters)
            .where(
              and(eq(characters.themeId, theme.id), inArray(characters.externalId, externalIds)),
            )
        : [];
      const characterIdByExternal = new Map(characterRows.map((c) => [c.externalId, c.id]));

      for (const round of record.rounds) {
        const characterId = characterIdByExternal.get(round.characterId);
        if (!characterId) continue;
        const [roundRow] = await tx
          .insert(rounds)
          .values({ matchId: match.id, number: round.number, characterId })
          .returning({ id: rounds.id });
        if (!roundRow) continue;

        const guessRows = round.guesses.flatMap((guess) => {
          const matchPlayerId = playerIdByKey.get(guess.playerKey);
          const guessedId = characterIdByExternal.get(guess.characterId);
          return matchPlayerId && guessedId
            ? [
                {
                  roundId: roundRow.id,
                  matchPlayerId,
                  characterId: guessedId,
                  timeMs: guess.timeMs,
                  order: guess.order,
                },
              ]
            : [];
        });
        if (guessRows.length) await tx.insert(guesses).values(guessRows);
      }
    });
  }
}
