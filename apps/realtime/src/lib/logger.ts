/** Logger mínimo com horário. Os erros também vão para o Sentry quando ele estiver ligado. */
type Level = "info" | "warn" | "error";

/** Para onde vão os erros além do console (o Sentry liga isso em src/lib/sentry.ts). */
let reportError: ((message: string, extra?: unknown) => void) | undefined;

export function setErrorReporter(reporter: typeof reportError): void {
  reportError = reporter;
}

function write(level: Level, message: string, extra?: unknown) {
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}`;
  const out = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  if (extra === undefined) out(line);
  else out(line, extra);
  if (level === "error") reportError?.(message, extra);
}

export const logger = {
  info: (message: string, extra?: unknown) => write("info", message, extra),
  warn: (message: string, extra?: unknown) => write("warn", message, extra),
  error: (message: string, extra?: unknown) => write("error", message, extra),
};
