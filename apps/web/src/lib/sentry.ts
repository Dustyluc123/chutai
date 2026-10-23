/**
 * Opções do Sentry no site, iguais no navegador e no servidor da Vercel.
 *
 * Sem NEXT_PUBLIC_SENTRY_DSN, o Sentry não liga (desenvolvimento local e deploys sem a variável).
 * Privacidade: nada de dados pessoais (`dataCollection`, o antigo `sendDefaultPii: false`),
 * sem Session Replay, amostragem baixa de desempenho e o filtro `scrubSentryEvent`, que tira
 * usuário, IP, cabeçalhos, corpo dos pedidos (apelidos e chutes) e rastros de cliques.
 */
import {
  SENTRY_DATA_COLLECTION,
  SENTRY_TRACES_SAMPLE_RATE,
  scrubSentryEvent,
} from "@chutai/shared";

export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || undefined;

/** Rastros que podem levar texto da tela, apelidos ou chutes: nem chegam a ser guardados. */
const DROPPED = /^(ui\.|console|xhr|fetch)/;

export const sentryOptions = {
  dsn: SENTRY_DSN,
  enabled: Boolean(SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  dataCollection: { ...SENTRY_DATA_COLLECTION, httpBodies: [] },
  tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
  // Barulho comum de extensões e navegadores que não é defeito do Chutaí.
  ignoreErrors: [
    "ResizeObserver loop",
    "Non-Error promise rejection captured",
    /^Script error\.?$/,
  ],
  // Sem as "sessões" (uma por visita): o navegador só fala com o Sentry quando há um erro.
  integrations: <T extends { name: string }>(defaults: T[]) =>
    defaults.filter((integration) => integration.name !== "BrowserSession"),
  beforeSend: <T extends object>(event: T) => scrubSentryEvent(event),
  beforeBreadcrumb: <T extends { category?: string }>(crumb: T) =>
    DROPPED.test(crumb.category ?? "") ? null : crumb,
};
