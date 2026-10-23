import { createRealtimeServer } from "./app";
import { loadConfig } from "./config";
import { logger } from "./lib/logger";

async function main() {
  const config = loadConfig();
  const server = await createRealtimeServer(config);
  const port = await server.listen();

  logger.info(`Servidor de tempo real ouvindo na porta ${port}`);
  logger.info(
    `Temas: ${server.mode.data === "json" ? "arquivos JSON" : "PostgreSQL"} · Salas: ${server.mode.rooms}`,
  );
  logger.info(`Origens permitidas: ${config.corsOrigins.join(", ")}`);

  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    logger.info(`Recebido ${signal}, salvando as salas e encerrando...`);
    // Se algo travar, sai mesmo assim antes do Railway matar o processo.
    setTimeout(() => process.exit(1), 10_000).unref();
    try {
      const saved = await server.shutdown();
      logger.info(`${saved} sala(s) salva(s) para o próximo servidor.`);
    } catch (error) {
      logger.error("Falha ao encerrar", error);
    }
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
  logger.error("Falha ao iniciar o servidor", error);
  process.exit(1);
});
