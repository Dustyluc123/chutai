/**
 * Sentry no servidor de tempo real: só erros, sem dados pessoais. Sem SENTRY_DSN, nada é
 * carregado (desenvolvimento local e testes).
 *
 * Privacidade: coleta de dados desligada (`dataCollection`, o antigo `sendDefaultPii`), sem
 * medições de desempenho (só erros), e o filtro
 * `scrubSentryEvent` tira usuário, IP, cabeçalhos, corpo dos pedidos e rastros antes de enviar.
 * Os apelidos e os chutes nunca entram nas mensagens de erro do servidor.
 */
import { SENTRY_DATA_COLLECTION, scrubSentryEvent } from "@chutai/shared";
import { setErrorReporter } from "./logger";

export async function initSentry(env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
  const dsn = env.SENTRY_DSN;
  if (!dsn) return false;
  const Sentry = await import("@sentry/node");
  Sentry.init({
    dsn,
    environment: env.SENTRY_ENVIRONMENT ?? env.RAILWAY_ENVIRONMENT_NAME ?? env.NODE_ENV,
    release: env.RAILWAY_GIT_COMMIT_SHA,
    // Nada de dados pessoais (no Sentry 11, isto substitui o antigo `sendDefaultPii: false`).
    dataCollection: { ...SENTRY_DATA_COLLECTION, httpBodies: [] },
    // Só erros: nada de medir desempenho.
    tracesSampleRate: 0,
    // O nome da máquina do Railway não ajuda e não precisa sair daqui.
    serverName: "realtime",
    beforeSend: (event) => scrubSentryEvent(event),
    beforeBreadcrumb: (crumb) => (crumb.category === "console" ? null : crumb),
  });
  setErrorReporter((message, extra) => {
    const error = extra instanceof Error ? extra : new Error(message);
    Sentry.captureException(error, { tags: { origem: "logger" }, contexts: { log: { message } } });
  });
  return true;
}
