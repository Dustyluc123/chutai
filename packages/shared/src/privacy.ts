/**
 * Privacidade dos relatórios de erro (Sentry), igual no site e no servidor.
 *
 * O Chutaí não manda para o Sentry nada que identifique alguém: nem usuário, nem IP, nem
 * cabeçalhos, cookies ou o corpo dos pedidos (onde estariam apelidos e chutes). Também saem os
 * rastros de cliques e do console (podem ter o texto da tela) e o "?query" dos endereços.
 * Os tipos são estruturais para não depender do pacote do Sentry aqui.
 */
export interface ScrubbableEvent {
  user?: unknown;
  request?: { url?: string; [key: string]: unknown };
  breadcrumbs?: { category?: string; data?: unknown; message?: string }[];
  extra?: unknown;
}

/** Categorias de rastro que podem levar texto da tela, apelidos ou chutes. */
const DROPPED_BREADCRUMBS = /^(ui\.|console|xhr|fetch|socket)/;

function withoutQuery(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

/**
 * O que o SDK do Sentry (versão 11) pode coletar: nada. No 11, esta opção substituiu o antigo
 * `sendDefaultPii`, e o padrão dela coleta usuário, cookies, cabeçalhos, corpos e até variáveis
 * locais (onde poderiam estar apelidos e chutes). Aqui tudo fica desligado.
 */
export const SENTRY_DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  stackFrameVariables: false,
  databaseQueryData: false,
  queues: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  mcp: { inputs: false, outputs: false },
} as const;

/** Taxa de amostragem das medições de desempenho (baixa, para caber no plano gratuito). */
export const SENTRY_TRACES_SAMPLE_RATE = 0.01;

export function scrubSentryEvent<T extends object>(input: T): T {
  const event = input as ScrubbableEvent;
  delete event.user;
  delete event.extra;
  if (event.request) {
    event.request = event.request.url ? { url: withoutQuery(event.request.url) } : {};
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs
      .filter((crumb) => !DROPPED_BREADCRUMBS.test(crumb.category ?? ""))
      .map((crumb) => {
        // Navegação: só o caminho (sem ?query).
        if (crumb.category === "navigation" && crumb.data && typeof crumb.data === "object") {
          const data = crumb.data as { from?: string; to?: string };
          return {
            ...crumb,
            data: {
              from: data.from ? withoutQuery(data.from) : undefined,
              to: data.to ? withoutQuery(data.to) : undefined,
            },
          };
        }
        return { ...crumb, data: undefined };
      });
  }
  return input;
}
