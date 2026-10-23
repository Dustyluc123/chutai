import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { toCharacterOptions } from "@chutai/db";
import { SiteHeader } from "@/components/layout/site-header";
import { DailyGame } from "@/components/daily/daily-game";
import { dailyStartsLater, dailyTheme, today } from "@/lib/daily/server";

/**
 * Página guardada em cache por 60 s (em vez de gerada a cada visita): numa live com muita gente,
 * isso poupa o processamento do plano gratuito da Vercel. Na virada do dia, quem pegar a página
 * do dia anterior recebe "Já tem desafio novo" da rota e a página recarrega sozinha.
 */
export const revalidate = 60;

/** Nenhum tema no build: cada um é gerado na primeira visita e depois fica no cache. */
export function generateStaticParams() {
  return [];
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const theme = dailyTheme((await params).slug);
  return {
    title: theme ? `Desafio do dia: ${theme.name}` : "Desafio do dia",
    description: "Um personagem por dia, o mesmo para todo mundo. Quantos chutes você precisa?",
  };
}

/**
 * Desafio diário de um tema. A página só manda a lista de personagens (para o autocompletar)
 * e os atributos; a resposta fica no servidor (rota /api/diario/[slug]).
 */
export default async function DailyPage({ params }: PageProps) {
  const theme = dailyTheme((await params).slug);
  if (!theme) notFound();
  const { number, dateKey } = today();
  const configured = !!process.env.DAILY_SECRET?.trim();
  const later = dailyStartsLater(theme, dateKey);
  return (
    <>
      <SiteHeader />
      <main
        id="conteudo"
        className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 pt-4 pb-16 sm:px-6"
      >
        {later ? (
          <p
            role="status"
            className="rounded-2xl border-2 border-tinta bg-gema-soft p-5 font-semibold"
          >
            O desafio diário de {theme.name} começa em {later.split("-").reverse().join("/")}. Até
            lá, dá para jogar os outros temas.
          </p>
        ) : configured ? (
          <DailyGame
            slug={theme.slug}
            themeName={theme.name}
            themeEmoji={theme.emoji}
            attributes={theme.attributes.map(({ key, label }) => ({ key, label }))}
            options={toCharacterOptions(theme)}
            day={number}
            noun={theme.noun}
          />
        ) : (
          <p
            role="alert"
            className="rounded-2xl border-2 border-pitanga bg-white p-5 font-semibold"
          >
            Desafio diário indisponível: falta configurar a variável DAILY_SECRET no servidor.
          </p>
        )}
      </main>
    </>
  );
}
