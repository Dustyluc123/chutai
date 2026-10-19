import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = {
  title: "Criar tema",
  description: "Como vai funcionar o editor de temas da comunidade do Chutaí.",
};

const EXAMPLE = `{
  "slug": "minha-turma",
  "name": "Minha turma",
  "attributes": [
    { "key": "cidade", "label": "Cidade", "type": "text" },
    { "key": "hobbies", "label": "Hobbies", "type": "list" },
    { "key": "idade", "label": "Idade", "type": "number" }
  ],
  "characters": [
    {
      "id": "ana",
      "name": "Ana",
      "values": { "cidade": "Recife", "hobbies": ["vôlei", "games"], "idade": 24 }
    }
  ]
}`;

const STEPS = [
  {
    title: "Dê um nome e escolha os atributos",
    text: "Atributos são as colunas do tabuleiro. Cada um tem um tipo: texto, lista, número ou número com margem.",
  },
  {
    title: "Cadastre os personagens",
    text: "Pelo menos 5, cada um com um valor para cada atributo. Apelidos ajudam o autocompletar.",
  },
  {
    title: "Use só na sua sala ou publique",
    text: "Temas privados servem para uma partida com os amigos. Temas públicos passam por moderação antes de aparecer para todos.",
  },
];

/** Fase 2 do projeto: esta página explica como o editor vai funcionar. */
export default function CreateThemePage() {
  return (
    <>
      <SiteHeader />
      <main
        id="conteudo"
        className="mx-auto grid w-full max-w-6xl flex-1 gap-12 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:py-16"
      >
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <span className="self-start rounded-full bg-chiclete px-3 py-1 text-sm font-bold">
              Em construção
            </span>
            <h1 className="font-display text-5xl sm:text-6xl">Crie o seu tema</h1>
            <p className="max-w-[52ch] text-lg text-tinta-soft">
              Logo dá para montar um dle da sua turma, da sua série favorita ou dos jogadores do seu
              time, e jogar com quem quiser.
            </p>
          </div>
          <ol className="flex flex-col gap-6">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span
                  aria-hidden
                  className="font-display flex size-11 shrink-0 items-center justify-center rounded-2xl border-2 border-tinta bg-gema text-xl"
                >
                  {index + 1}
                </span>
                <div className="flex flex-col gap-1 pt-0.5">
                  <h2 className="font-bold">{step.title}</h2>
                  <p className="text-tinta-soft">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <Link
            href="/temas"
            className="self-start rounded-xl border-2 border-tinta bg-white px-4 py-2.5 font-bold shadow-carimbo-sm"
          >
            Ver os temas que já existem
          </Link>
        </div>

        <section aria-labelledby="formato" className="flex flex-col gap-3">
          <h2 id="formato" className="text-lg font-bold">
            Formato de um tema
          </h2>
          <p className="text-sm text-tinta-soft">
            Enquanto o editor não chega, temas novos podem ser enviados como arquivo JSON neste
            formato (veja os oficiais em{" "}
            <code className="rounded bg-white px-1">packages/db/seed</code>).
          </p>
          <pre className="overflow-x-auto rounded-2xl border-2 border-tinta bg-tinta p-5 text-sm leading-relaxed text-gema-soft">
            <code>{EXAMPLE}</code>
          </pre>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
