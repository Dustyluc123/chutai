import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { toCharacterOptions } from "@chutai/db";
import { SiteHeader } from "@/components/layout/site-header";
import { SoloGame } from "@/components/game/solo-game";
import { getTheme, listThemes } from "@/lib/themes";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return (await listThemes()).map((theme) => ({ slug: theme.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const theme = await getTheme((await params).slug);
  return { title: theme ? `Treino: ${theme.name}` : "Treino" };
}

/**
 * Modo treino: sozinho, sem tempo e sem pontos. Roda inteiro no navegador
 * com as mesmas regras de @chutai/game (aqui não há o que trapacear).
 */
export default async function SoloPage({ params }: PageProps) {
  const theme = await getTheme((await params).slug);
  if (!theme || theme.visibility === "private") notFound();
  return (
    <>
      <SiteHeader />
      <main
        id="conteudo"
        className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 pt-4 pb-16 sm:px-6"
      >
        <SoloGame theme={theme} options={toCharacterOptions(theme)} />
      </main>
    </>
  );
}
