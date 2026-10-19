import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatValue } from "@chutai/game";
import type { AttributeType } from "@chutai/shared";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { THEME_COLORS } from "@/lib/colors";
import { cn } from "@/lib/cn";
import { getTheme, listThemes } from "@/lib/themes";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const HOW_IT_COMPARES: Record<AttributeType, string> = {
  text: "Verde se for igual, vermelho se não for.",
  list: "Verde se a lista for igual, amarelo se tiver algo em comum.",
  number: "Verde se for igual; senão, a seta mostra se a resposta é maior ou menor.",
  range: "Verde se for igual, amarelo se chegar perto; a seta mostra o lado.",
};

export async function generateStaticParams() {
  return (await listThemes()).map((theme) => ({ slug: theme.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const theme = await getTheme((await params).slug);
  if (!theme) return { title: "Tema não encontrado" };
  return {
    title: `${theme.name}: personagens e atributos`,
    description: `${theme.description} Jogue o dle de ${theme.name.toLowerCase()} com seus amigos no Chutaí.`,
  };
}

/** Página pública de um tema: boa para o Google e para estudar antes da partida. */
export default async function ThemePage({ params }: PageProps) {
  const theme = await getTheme((await params).slug);
  if (!theme || theme.visibility === "private") notFound();
  const color = THEME_COLORS[theme.color];
  const characters = [...theme.characters].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <>
      <div className={cn(color.bg, color.text, "border-b-2 border-tinta")}>
        <SiteHeader tone={color.text === "text-white" ? "light" : "dark"} />
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-6 pb-12 sm:px-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-3">
            <span aria-hidden className="text-7xl leading-none">
              {theme.emoji}
            </span>
            <h1 className="font-display text-5xl sm:text-6xl">{theme.name}</h1>
            <p className="max-w-[56ch] text-lg font-medium opacity-90">{theme.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/?tema=${theme.slug}#comecar`}
              className="inline-flex h-12 items-center rounded-xl border-2 border-tinta bg-white px-5 font-bold text-tinta shadow-carimbo"
            >
              Criar sala com este tema
            </a>
            <Link
              href={`/treino/${theme.slug}`}
              className="inline-flex h-12 items-center rounded-xl border-2 border-current px-5 font-bold hover:bg-white/15"
            >
              Treinar sozinho
            </Link>
          </div>
        </div>
      </div>

      <main
        id="conteudo"
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-14 px-4 py-12 sm:px-6"
      >
        <section aria-labelledby="atributos" className="flex flex-col gap-5">
          <h2 id="atributos" className="font-display text-3xl">
            O que cada palpite compara
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {theme.attributes.map((attr) => (
              <li
                key={attr.key}
                className="flex flex-col gap-1 rounded-2xl border-2 border-tinta bg-white p-4"
              >
                <span className="font-bold">
                  {attr.label}
                  {attr.unit ? (
                    <span className="font-medium text-tinta-soft"> ({attr.unit})</span>
                  ) : null}
                </span>
                <span className="text-sm text-tinta-soft">{HOW_IT_COMPARES[attr.type]}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="personagens" className="flex flex-col gap-5">
          <h2 id="personagens" className="font-display text-3xl">
            {characters.length} personagens
          </h2>
          <div className="overflow-x-auto rounded-2xl border-2 border-tinta bg-white">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <caption className="sr-only">
                Personagens do tema {theme.name} e seus atributos
              </caption>
              <thead className="bg-papel">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Personagem
                  </th>
                  {theme.attributes.map((attr) => (
                    <th key={attr.key} scope="col" className="px-4 py-3 font-semibold">
                      {attr.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {characters.map((character) => (
                  <tr key={character.id} className="border-t border-linha">
                    <th scope="row" className="px-4 py-2.5 font-semibold">
                      <span aria-hidden className="mr-2">
                        {character.emoji}
                      </span>
                      {character.name}
                    </th>
                    {theme.attributes.map((attr) => (
                      <td key={attr.key} className="px-4 py-2.5 text-tinta-soft">
                        {formatValue(attr, character.values[attr.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-tinta-soft">
            Achou algum dado errado? Os temas ficam em arquivos JSON no repositório e qualquer um
            pode sugerir correções.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
