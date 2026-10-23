import type { Metadata } from "next";
import Link from "next/link";
import { Heart, Server, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { AUTHOR, SiteFooter } from "@/components/layout/site-footer";
import { PixBox } from "@/components/support/pix-box";
import { LinkedinIcon } from "@/components/ui/brand-icons";

export const metadata: Metadata = {
  title: "Apoie o projeto",
  description:
    "O Chutaí é gratuito e sem anúncios. Quem quiser pode ajudar a manter o servidor no ar com um Pix de qualquer valor.",
};

/** Página curta para quem quiser ajudar a manter o Chutaí no ar. */
export default function SupportPage() {
  return (
    <>
      <SiteHeader />
      <main
        id="conteudo"
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 lg:py-16"
      >
        <div className="flex flex-col gap-3">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-tinta-soft">
            <Heart aria-hidden className="size-4 fill-pitanga text-tinta" /> Apoie o projeto
          </p>
          <h1 className="font-display text-4xl sm:text-5xl">O Chutaí é de graça e sem anúncios</h1>
          <p className="max-w-[60ch] text-lg text-tinta-soft">
            Oi! Sou o{" "}
            <a
              href={AUTHOR.linkedin}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-anil underline-offset-4 hover:underline"
            >
              {AUTHOR.name}
              <LinkedinIcon className="size-4" />
            </a>
            , quem fez o Chutaí. Fiz o jogo para jogar com os amigos e continua assim: sem cadastro,
            sem anúncio e sem nada pago para jogar.
          </p>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2">
          <li className="flex gap-3 rounded-2xl border-2 border-tinta bg-white p-4">
            <Server aria-hidden className="mt-0.5 size-5 shrink-0 text-anil" />
            <p className="text-sm">
              <strong>Para onde vai:</strong> o servidor das salas em tempo real e o que guarda as
              partidas durante as atualizações têm custo todo mês.
            </p>
          </li>
          <li className="flex gap-3 rounded-2xl border-2 border-tinta bg-white p-4">
            <Sparkles aria-hidden className="mt-0.5 size-5 shrink-0 text-laranja" />
            <p className="text-sm">
              <strong>Não precisa:</strong> jogar, chamar os amigos e mandar o resultado no grupo já
              ajuda muito. Se quiser ajudar com qualquer valor, é por aqui.
            </p>
          </li>
        </ul>

        <PixBox />

        <p className="text-sm text-tinta-soft">
          Obrigado! Achou um defeito ou tem uma ideia de tema? Escreva para{" "}
          <a href={`mailto:${AUTHOR.email}`} className="font-semibold text-anil hover:underline">
            {AUTHOR.email}
          </a>
          .{" "}
          <Link href="/" className="font-semibold text-anil hover:underline">
            Voltar ao jogo
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
