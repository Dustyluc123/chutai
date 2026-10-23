/**
 * Roda no navegador antes do site. Liga o Sentry só se houver NEXT_PUBLIC_SENTRY_DSN.
 * Sem Session Replay: nenhuma gravação de tela.
 */
import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, sentryOptions } from "@/lib/sentry";

if (SENTRY_DSN) Sentry.init(sentryOptions);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
