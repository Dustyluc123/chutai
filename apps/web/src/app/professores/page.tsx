import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, MonitorUp, Settings2, Smartphone } from "lucide-react";
import { LIMITS } from "@chutai/shared";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ThemePoster } from "@/components/home/theme-poster";
import { listThemes } from "@/lib/themes";

export const metadata: Metadata = {
  title: "Para professores",
  description:
    "Como usar o Chutaí numa aula: projete a tela, os alunos entram pelo celular com o código e a turma inteira joga junto.",
};

/** Temas que combinam com a escola, na ordem em que aparecem aqui. */
const SCHOOL_THEMES = [
  "historia-do-brasil",
  "estados-do-brasil",
  "fauna-brasileira",
  "folclore-brasileiro",
];

const STEPS = [
  {
    Icon: MonitorUp,
    title: "Projete a tela",
    text: "No computador da sala, abra o Chutaí, escolha o tema e crie a sala. O código aparece grande, bom para projetar.",
  },
  {
    Icon: Smartphone,
    title: "Os alunos entram pelo celular",
    text: `Cada um digita o código (ou abre o link) e escolhe um apelido. Não precisa de cadastro nem de instalar nada. Cabem até ${LIMITS.maxPlayers.max} jogadores por sala (o máximo você escolhe no lobby): dá para a turma inteira jogar junta; em turmas maiores, jogue em grupos, com um celular por grupo.`,
  },
  {
    Icon: Settings2,
    title: "Ajuste as regras",
    text: 'Sugestão: 5 rodadas de 2 minutos, com dicas ligadas. O modo Misto alterna atributos e imagens e prende a atenção; em Estados do Brasil, o modo Imagem vira "adivinhe pela bandeira".',
  },
  {
    Icon: CalendarDays,
    title: "Aproveite a revelação",
    text: "No fim de cada rodada aparece quem era e todos os atributos. É o momento de comentar: por que esse estado tem litoral? Em que período essa pessoa nasceu?",
  },
];

/** Página curta para quem quer usar o Chutaí em sala de aula. */
export default async function TeachersPage() {
  const themes = await listThemes();
  const school = SCHOOL_THEMES.flatMap((slug) => themes.filter((theme) => theme.slug === slug));

  return (
    <>
      <SiteHeader />
      <main
        id="conteudo"
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-4 py-10 sm:px-6 lg:py-16"
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-tinta-soft">Para professores</p>
          <h1 className="font-display text-5xl sm:text-6xl">Chutaí na sala de aula</h1>
          <p className="max-w-[62ch] text-lg text-tinta-soft">
            Um jogo rápido de adivinhar para revisar conteúdo com a turma toda ao mesmo tempo. Cada
            chute mostra o que bate e o que não bate com a resposta secreta, então os alunos
            raciocinam com os dados, não só com a memória.
          </p>
        </div>

        <section aria-labelledby="como-usar" className="flex flex-col gap-5">
          <h2 id="como-usar" className="font-display text-3xl">
            Como usar numa aula
          </h2>
          <ol className="grid gap-4 sm:grid-cols-2">
            {STEPS.map(({ Icon, title, text }, index) => (
              <li
                key={title}
                className="flex gap-4 rounded-3xl border-2 border-tinta bg-white p-5 shadow-carimbo-sm"
              >
                <span className="font-display flex size-10 shrink-0 items-center justify-center rounded-full bg-gema text-lg">
                  {index + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <Icon aria-hidden className="size-4" /> {title}
                  </h3>
                  <p className="text-sm text-tinta-soft">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="temas-escola" className="flex flex-col gap-5">
          <h2 id="temas-escola" className="font-display text-3xl">
            Temas que combinam com a escola
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {school.map((theme) => (
              <li key={theme.slug}>
                <ThemePoster theme={theme} className="h-full" />
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="tarefa"
          className="flex flex-col gap-3 rounded-3xl border-2 border-tinta bg-anil-soft p-6"
        >
          <h2 id="tarefa" className="font-display text-2xl">
            Para depois da aula
          </h2>
          <p className="max-w-[62ch] text-tinta-soft">
            O{" "}
            <Link href="/diario" className="font-semibold text-tinta underline">
              desafio do dia
            </Link>{" "}
            tem um por tema, o mesmo para todo mundo, e muda à meia-noite. Dá para propor como
            tarefa: no dia seguinte, a turma compara quantos chutes cada um precisou.
          </p>
          <p className="max-w-[62ch] text-sm text-tinta-soft">
            Os dados vêm da Wikipédia, do Wikidata e do IBGE, e as imagens têm licença livre (veja
            os{" "}
            <Link href="/creditos" className="font-semibold text-tinta underline">
              créditos
            </Link>
            ). O jogo não pede cadastro nem e-mail: cada aluno só escolhe um apelido.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
