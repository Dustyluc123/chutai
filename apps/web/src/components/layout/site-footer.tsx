import Link from "next/link";
import { Mail } from "lucide-react";
import { LinkedinIcon } from "@/components/ui/brand-icons";
import { Logo } from "@/components/ui/logo";

export const AUTHOR = {
  name: "Lucas Barreto",
  email: "lucasbrsantana@gmail.com",
  linkedin: "https://www.linkedin.com/in/lucas-barreto-santana-67aa932b6/",
};

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

        <nav aria-label="Rodapé" className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">Jogo</span>
          <Link href="/" className="text-tinta-soft hover:text-tinta">
            Criar sala
          </Link>
          <Link href="/temas" className="text-tinta-soft hover:text-tinta">
            Temas
          </Link>
          <Link href="/criar-tema" className="text-tinta-soft hover:text-tinta">
            Criar um tema
          </Link>
          <Link href="/diario" className="text-tinta-soft hover:text-tinta">
            Desafio do dia
          </Link>
          <Link href="/professores" className="text-tinta-soft hover:text-tinta">
            Para professores
          </Link>
          <Link href="/creditos" className="text-tinta-soft hover:text-tinta">
            Créditos das imagens
          </Link>
        </nav>

        <div className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">Feito por {AUTHOR.name}</span>
          <a
            href={AUTHOR.linkedin}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-tinta-soft hover:text-tinta"
          >
            <LinkedinIcon className="size-4" /> LinkedIn
          </a>
          <a
            href={`mailto:${AUTHOR.email}`}
            className="inline-flex items-center gap-2 text-tinta-soft hover:text-tinta"
          >
            <Mail aria-hidden className="size-4" /> {AUTHOR.email}
          </a>
        </div>
      </div>
    </footer>
  );
}
