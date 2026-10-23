import Link from "next/link";
import { Heart, Mail } from "lucide-react";
import { LinkedinIcon } from "@/components/ui/brand-icons";
import { Logo } from "@/components/ui/logo";

export const AUTHOR = {
  name: "Lucas Barreto",
  email: "lucasbrsantana@gmail.com",
  linkedin: "https://www.linkedin.com/in/lucas-barreto-santana-67aa932b6/",
};

/**
 * Os links do rodapé não são pré-carregados: cada pré-carregamento é uma requisição à mais na
 * Vercel (o plano gratuito tem limite de requisições por mês), e quase ninguém clica neles.
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t-2 border-tinta bg-white">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-sm text-sm text-tinta-soft">
            Dle multiplayer em tempo real. Crie uma sala, chame os amigos e descubra o personagem
            antes de todo mundo.
          </p>
        </div>

        <nav aria-label="Rodapé" className="flex flex-col gap-0 text-sm sm:gap-2">
          <span className="font-semibold">Jogo</span>
          <Link
            prefetch={false}
            href="/"
            className="text-tinta-soft hover:text-tinta max-sm:inline-flex max-sm:min-h-11 max-sm:items-center"
          >
            Criar sala
          </Link>
          <Link
            prefetch={false}
            href="/temas"
            className="text-tinta-soft hover:text-tinta max-sm:inline-flex max-sm:min-h-11 max-sm:items-center"
          >
            Temas
          </Link>
          <Link
            prefetch={false}
            href="/criar-tema"
            className="text-tinta-soft hover:text-tinta max-sm:inline-flex max-sm:min-h-11 max-sm:items-center"
          >
            Criar um tema
          </Link>
          <Link
            prefetch={false}
            href="/diario"
            className="text-tinta-soft hover:text-tinta max-sm:inline-flex max-sm:min-h-11 max-sm:items-center"
          >
            Desafio do dia
          </Link>
          <Link
            prefetch={false}
            href="/professores"
            className="text-tinta-soft hover:text-tinta max-sm:inline-flex max-sm:min-h-11 max-sm:items-center"
          >
            Para professores
          </Link>
          <Link
            prefetch={false}
            href="/creditos"
            className="text-tinta-soft hover:text-tinta max-sm:inline-flex max-sm:min-h-11 max-sm:items-center"
          >
            Créditos das imagens
          </Link>
        </nav>

        <div className="flex flex-col gap-0 text-sm sm:gap-2">
          <span className="font-semibold">Feito por {AUTHOR.name}</span>
          <a
            href={AUTHOR.linkedin}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-tinta-soft hover:text-tinta max-sm:min-h-11"
          >
            <LinkedinIcon className="size-4" /> LinkedIn
          </a>
          <a
            href={`mailto:${AUTHOR.email}`}
            className="inline-flex items-center gap-2 text-tinta-soft hover:text-tinta max-sm:min-h-11"
          >
            <Mail aria-hidden className="size-4" /> {AUTHOR.email}
          </a>
          <Link
            prefetch={false}
            href="/apoie"
            className="inline-flex items-center gap-2 text-tinta-soft hover:text-tinta max-sm:min-h-11"
          >
            <Heart aria-hidden className="size-4" /> Apoie o projeto
          </Link>
        </div>
      </div>
    </footer>
  );
}
