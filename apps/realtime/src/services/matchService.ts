import type { MatchRecord, MatchRepository } from "@chutai/db";
import { logger } from "../lib/logger";

/**
 * Salva as partidas que terminaram. Hoje vão para a memória;
 * com DATABASE_URL vão para o PostgreSQL (histórico, ranking, estatísticas).
 * Uma falha aqui nunca derruba a sala: só fica registrada no log.
 */
export class MatchService {
  constructor(private readonly repository: MatchRepository) {}

  async save(record: MatchRecord): Promise<void> {
    try {
      await this.repository.save(record);
      logger.info(
        `Partida da sala ${record.roomCode} salva (${record.players.length} jogadores, ${record.rounds.length} rodadas).`,
      );
    } catch (error) {
      logger.error(`Falha ao salvar partida da sala ${record.roomCode}`, error);
    }
  }
}
