/** Logger mínimo com horário. Trocável por pino/Sentry no futuro sem mudar quem usa. */
type Level = "info" | "warn" | "error";

function write(level: Level, message: string, extra?: unknown) {
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}`;
  const out = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  if (extra === undefined) out(line);
  else out(line, extra);
}

export const logger = {
  info: (message: string, extra?: unknown) => write("info", message, extra),
  warn: (message: string, extra?: unknown) => write("warn", message, extra),
  error: (message: string, extra?: unknown) => write("error", message, extra),
};
