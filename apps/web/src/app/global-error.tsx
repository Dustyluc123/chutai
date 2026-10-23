"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import "@/styles/globals.css";

/** Erro no próprio layout do site (raro): avisa o Sentry e oferece recarregar. */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="flex min-h-dvh flex-col">
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-4 py-20">
          <h1 className="font-display text-4xl">Algo deu errado aqui.</h1>
          <p className="text-tinta-soft">O site não carregou direito. Recarregue a página.</p>
          <a
            href="/"
            className="inline-flex h-11 w-fit items-center rounded-xl border-2 border-tinta bg-gema px-5 font-semibold"
          >
            Ir para o início
          </a>
        </main>
      </body>
    </html>
  );
}
