import Link from "next/link";
import type { AttributeFeedback } from "@chutai/shared";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { StartPanel } from "@/components/home/start-panel";
import { DemoBoard } from "@/components/home/demo-board";
import { ThemePoster } from "@/components/home/theme-poster";
import { Tile } from "@/components/game/tile";
import { getTheme, listThemes } from "@/lib/themes";

const STEPS = [
  {
    title: "Crie a sala",
    text: "Escolha um tema, quantas rodadas e quanto tempo cada uma vai ter.",
  },
  {
    title: "Chame a galera",
    text: "Mande o código ou o link no grupo. Ninguém precisa de cadastro, só de um apelido.",
  },
  {
    title: "Chute e corra",
    text: "Todos tentam achar o mesmo personagem ao mesmo tempo. Velocidade e poucos chutes valem mais pontos.",
  },
];

const LEGEND: { title: string; text: string; label: string; feedback: AttributeFeedback }[] = [
  {
    title: "Verde",
    text: "esse atributo é igual ao do personagem secreto.",
    label: "Forma",
    feedback: { key: "forma", display: "Humanoide", status: "correct" },
  },
  {
    title: "Amarelo",
    text: "tem algo em comum (numa lista) ou chegou perto (num número).",
    label: "Onde aparece",
    feedback: { key: "habitat", display: "Mata", status: "partial" },
  },
  {
    title: "Vermelho",
    text: "não tem nada a ver.",
    label: "Região",
    feedback: { key: "regiao", display: "Norte", status: "wrong" },
  },
  {
    title: "Seta",
    text: "em números, aponta para onde está a resposta. Para cima, é maior.",
    label: "Nascimento",
    feedback: { key: "nascimento", display: "1958", status: "wrong", direction: "up" },
  },
];

export default async function HomePage() {
  const themes = await listThemes();
  const folclore = await getTheme("folclore-brasileiro");

  return (
    <>
      <div className="bg-anil text-white">
        <SiteHeader tone="light" />
        <main
          id="conteudo"
          className="mx-auto grid w-full max-w-6xl items-start gap-10 px-4 pt-6 pb-16 sm:px-6 lg:grid-cols-[1fr_minmax(0,28rem)] lg:gap-x-12 lg:gap-y-8 lg:pt-10 lg:pb-24"
        >
          {/* No celular: título, cartão de criar sala, exemplo. No computador: cartão à direita. */}
          <div className="flex min-w-0 flex-col gap-5 lg:col-start-1 lg:row-start-1">
            <h1 className="font-display max-w-[14ch] text-[2.55rem] sm:text-6xl lg:text-7xl">
              Adivinhe o personagem antes dos seus amigos.
            </h1>
            <p className="max-w-[52ch] text-lg text-white/85">
              Crie uma sala, mande o código no grupo e chute. Cada palpite mostra o que bate e o que
              não bate com o personagem secreto. Quem acerta mais rápido e com menos chutes leva
              mais pontos.
            </p>
          </div>

          <div
            id="comecar"
            className="flex scroll-mt-6 justify-center lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:justify-end"
          >
            <StartPanel themes={themes} />
          </div>

          {folclore ? (
            <div className="min-w-0 lg:col-start-1 lg:row-start-2">
              <DemoBoard
                theme={folclore}
                answerId="saci-perere"
                guessIds={["iara", "curupira", "saci-perere"]}
              />
            </div>
          ) : null}
        </main>
      </div>

      <section
        aria-labelledby="temas-titulo"
        className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24"
      >
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 id="temas-titulo" className="font-display text-4xl sm:text-5xl">
            Três temas para começar
          </h2>
          <Link
            href="/temas"
            className="font-semibold text-anil underline-offset-4 hover:underline"
          >
            Ver todos os temas
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {themes.map((theme) => (
            <ThemePoster key={theme.slug} theme={theme} />
          ))}
        </div>
      </section>

      <section
        id="como-funciona"
        aria-labelledby="como-titulo"
        className="scroll-mt-6 border-t-2 border-tinta bg-white"
      >
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="flex flex-col gap-8">
            <h2 id="como-titulo" className="font-display text-4xl sm:text-5xl">
              Como funciona
            </h2>
            <ol className="flex flex-col gap-6">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span
                    aria-hidden
                    className="font-display flex size-12 shrink-0 items-center justify-center rounded-2xl border-2 border-tinta bg-gema text-2xl shadow-carimbo-sm"
                  >
                    {index + 1}
                  </span>
                  <div className="flex flex-col gap-1 pt-1">
                    <h3 className="text-lg font-bold">{step.title}</h3>
                    <p className="max-w-[46ch] text-tinta-soft">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex flex-col gap-6 rounded-3xl bg-papel p-6 sm:p-8">
            <h3 className="text-xl font-bold">O que as cores dizem</h3>
            <ul className="flex flex-col gap-4">
              {LEGEND.map((item) => (
                <li key={item.title} className="grid grid-cols-[5.5rem_1fr] items-center gap-5">
                  <Tile standalone label={item.label} feedback={item.feedback} />
                  <p className="text-tinta-soft">
                    <strong className="text-tinta">{item.title}:</strong> {item.text}
                  </p>
                </li>
              ))}
            </ul>
            <p className="text-sm text-tinta-soft">
              Pontos por rodada: até 1.000 por velocidade e acerto, menos 40 por chute extra e 150
              por dica. O primeiro a acertar ganha +100 e o segundo, +50.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
