/** Liga o Sentry no servidor da Vercel (páginas, rotas e imagens geradas). */
import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, sentryOptions } from "@/lib/sentry";

export function register() {
  if (SENTRY_DSN) Sentry.init(sentryOptions);
}

/** Erros nas páginas e rotas do servidor (o Next chama isto). */
export const onRequestError = Sentry.captureRequestError;
