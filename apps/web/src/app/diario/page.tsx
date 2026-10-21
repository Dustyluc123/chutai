import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { DailyCards } from "@/components/daily/daily-cards";
import { dailyStartsLater, dailyThemes, today } from "@/lib/daily/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Desafio do dia",
  description:
    "Um personagem por dia em cada tema, o mesmo para todo mundo. Descubra e compare o resultado com os amigos.",
};

/** Lista dos desafios do dia, um por tema. */
export default function DailyIndexPage() {
  const { number, dateKey } = today();
  const themes = dailyThemes().map((theme) => ({
    slug: theme.slug,
    name: theme.name,
    emoji: theme.emoji,
    color: theme.color,
    characterCount: theme.characters.length,
    startsOn: dailyStartsLater(theme, dateKey),
  }));
  return (
    <>
      <SiteHeader />
      <main
        id="conteudo"
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 pt-6 pb-16 sm:px-6"
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-tinta-soft">Chutaí #{number}</p>
          <h1 className="font-display text-5xl sm:text-6xl">Desafio do dia</h1>
          <p className="max-w-[60ch] text-lg text-tinta-soft">
            Um personagem por tema, o mesmo para todo mundo. Sem tempo e sem limite de chutes. O
            desafio muda à meia-noite de Brasília.
          </p>
        </div>
        <DailyCards themes={themes} day={number} />
      </main>
      <SiteFooter />
    </>
  );
}
