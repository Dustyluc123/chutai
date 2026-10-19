import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ThemePoster } from "@/components/home/theme-poster";
import { listThemes } from "@/lib/themes";

export const metadata: Metadata = {
  title: "Temas",
  description:
    "Todos os temas do Chutaí: folclore brasileiro, lendas do futebol, fauna brasileira e mais.",
};

export default async function ThemesPage() {
  const themes = await listThemes();
  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:py-16">
        <div className="mb-10 flex flex-col gap-3">
          <h1 className="font-display text-5xl sm:text-6xl">Temas</h1>
          <p className="max-w-[60ch] text-lg text-tinta-soft">
            Cada tema tem seus personagens e seus atributos. Escolha um para criar a sala ou treine
            sozinho antes de desafiar os amigos.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {themes.map((theme) => (
            <ThemePoster key={theme.slug} theme={theme} />
          ))}
          <article className="flex min-h-72 flex-col justify-between gap-6 rounded-3xl border-2 border-dashed border-tinta/40 p-6">
            <div className="flex flex-col gap-2">
              <h2 className="font-display text-3xl">Seu tema aqui</h2>
              <p className="text-sm text-tinta-soft">
                Em breve qualquer pessoa poderá criar temas: a turma do trabalho, sua série
                favorita, os jogadores do seu time.
              </p>
            </div>
            <Link
              href="/criar-tema"
              className="self-start rounded-xl border-2 border-tinta bg-white px-3.5 py-2 text-sm font-bold shadow-carimbo-sm"
            >
              Como vai funcionar
            </Link>
          </article>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
