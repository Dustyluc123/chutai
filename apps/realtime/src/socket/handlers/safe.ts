import type { z } from "zod";
import { firstZodError, type Ack } from "@chutai/shared";
import { GameError } from "../../lib/errors";
import { logger } from "../../lib/logger";

type AckFn<T> = (response: Ack<T>) => void;

/**
 * Embrulha um handler: valida o payload com Zod, executa e responde pelo ack.
 * Erros de jogo viram mensagem para o jogador; erros inesperados viram log + mensagem genérica.
 */
export function withValidation<S extends z.ZodType, T>(
  schema: S,
  handler: (input: z.infer<S>) => Promise<T> | T,
) {
  return async (payload: unknown, ack: AckFn<T>) => {
    const respond = typeof ack === "function" ? ack : () => {};
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      respond({ ok: false, error: firstZodError(parsed.error) });
      return;
    }
    await run(() => handler(parsed.data), respond);
  };
}

/** Mesma ideia para eventos sem payload (só o ack). */
export function withoutPayload<T>(handler: () => Promise<T> | T) {
  return async (ack: AckFn<T>) => {
    const respond = typeof ack === "function" ? ack : () => {};
    await run(handler, respond);
  };
}

async function run<T>(handler: () => Promise<T> | T, respond: AckFn<T>) {
  try {
    respond({ ok: true, data: await handler() });
  } catch (error) {
    if (error instanceof GameError) {
      respond({ ok: false, error: error.message });
    } else {
      logger.error("Erro inesperado num evento", error);
      respond({ ok: false, error: "Algo deu errado no servidor. Tente de novo." });
    }
  }
}
