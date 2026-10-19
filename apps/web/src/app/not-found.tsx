import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-anil text-white">
      <SiteHeader tone="light" />
      <main
        id="conteudo"
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 pb-20 sm:px-6"
      >
        <p className="font-display text-[7rem] leading-none text-gema sm:text-[10rem]">404</p>
        <h1 className="font-display text-4xl sm:text-5xl">Chutou longe.</h1>
        <p className="max-w-[48ch] text-lg text-white/85">
          Essa página não existe. Se você recebeu um link de sala, confira se o código tem 6 letras
          e números.
        </p>
        <Link
          href="/"
          className="self-start rounded-xl border-2 border-tinta bg-gema px-5 py-3 font-bold text-tinta shadow-carimbo"
        >
          Voltar para o início
        </Link>
      </main>
    </div>
  );
}
