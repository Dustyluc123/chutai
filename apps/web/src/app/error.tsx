"use client";

import { Button } from "@/components/ui/button";

/** Erro inesperado numa página: explica e oferece tentar de novo. */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main
      id="conteudo"
      className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-4 py-20"
    >
      <h1 className="font-display text-4xl">Algo deu errado aqui.</h1>
      <p className="text-tinta-soft">
        A página não carregou direito. Tente de novo; se continuar, volte ao início.
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>Tentar de novo</Button>
        <a
          href="/"
          className="inline-flex h-11 items-center rounded-xl px-5 font-semibold hover:bg-tinta/5"
        >
          Ir para o início
        </a>
      </div>
    </main>
  );
}
