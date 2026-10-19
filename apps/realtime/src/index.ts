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

  const shutdown = async (signal: string) => {
    logger.info(`Recebido ${signal}, encerrando...`);
    await server.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
  logger.error("Falha ao iniciar o servidor", error);
  process.exit(1);
});
