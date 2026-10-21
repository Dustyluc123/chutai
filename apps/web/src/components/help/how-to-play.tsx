"use client";

import { CircleHelp, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { Character, ThemeAttribute } from "@chutai/shared";
import { HINTS, IMAGE_MODE, SCORING, compareCharacters } from "@chutai/game";
import { Tile } from "@/components/game/tile";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export type HelpTab = "classic" | "image";

/**
 * Exemplo do modo Clássico com dados reais do tema Fauna brasileira (copiados de
 * packages/db/seed/fauna-brasileira.json) e as mesmas regras do jogo (@chutai/game).
 */
const ATTRIBUTES: ThemeAttribute[] = [
  { key: "grupo", label: "Grupo", type: "text" },
  { key: "alimentacao", label: "Alimentação", type: "text" },
  { key: "ambiente", label: "Vive", type: "text" },
  {
    key: "peso",
    label: "Peso",
    type: "range",
    unit: "kg",
    tolerance: 30,
    toleranceIsPercent: true,
  },
];
const ANSWER: Character = {
  id: "lobo-guara",
  name: "Lobo-guará",
  emoji: "🐺",
  values: { grupo: "Mamífero", alimentacao: "Onívoro", ambiente: "Terrestre", peso: 25 },
};
const GUESSES: Character[] = [
  {
    id: "anta",
    name: "Anta",
    emoji: "🐗",
    values: {
      grupo: "Mamífero",
      alimentacao: "Herbívoro",
      ambiente: "Terrestre",
      peso: 250,
    },
  },
  {
    id: "tamandua-bandeira",
    name: "Tamanduá",
    emoji: "🐜",
    values: {
      grupo: "Mamífero",
      alimentacao: "Insetívoro",
      ambiente: "Terrestre",
      peso: 30,
    },
  },
  ANSWER,
];

const STEPS: Record<HelpTab, string[]> = {
  classic: [
    "Existe um personagem secreto. Todo mundo da sala tenta descobrir o mesmo.",
    "Chute qualquer nome. Cada coluna compara um atributo com o do secreto.",
    "Verde é igual, amarelo chegou perto e vermelho é diferente. A seta diz se o secreto é maior ou mais recente.",
    `Quem acerta rápido e com poucos chutes ganha mais. Depois de ${HINTS.unlockAfterGuesses} chutes, dá para pedir dica (−${SCORING.perHint} pontos).`,
  ],
  image: [
    "Aparece um pedaço borrado da imagem do personagem secreto.",
    "Chute pelo nome. Cada erro (ou dica) deixa a imagem mais nítida e afasta o zoom.",
    "As opções mostram só o nome, sem foto, para ninguém comparar.",
    `Acertar cedo vale mais: cada chute extra custa ${IMAGE_MODE.perExtraGuess} pontos.`,
  ],
};

function ClassicExample() {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <div
        role="table"
        aria-label="Exemplo: três chutes até achar o Lobo-guará"
        className="flex min-w-max flex-col gap-1.5"
      >
        <div role="row" className="grid grid-cols-[6.5rem_repeat(4,5.5rem)] gap-1.5">
          <div role="columnheader" className="text-xs font-semibold text-tinta-soft">
            Chute
          </div>
          {ATTRIBUTES.map((attr) => (
            <div
              key={attr.key}
              role="columnheader"
              className="text-center text-xs font-semibold text-tinta-soft"
            >
              {attr.label}
            </div>
          ))}
        </div>
        {GUESSES.map((guess, row) => (
          <div
            key={guess.id}
            role="row"
            className="grid grid-cols-[6.5rem_repeat(4,5.5rem)] gap-1.5 motion-safe:animate-pop"
            style={{ animationDelay: `${row * 900}ms` }}
          >
            <div
              role="rowheader"
              className={cn(
                "flex items-center gap-1.5 rounded-xl border-2 px-2 text-xs font-semibold",
                guess.id === ANSWER.id ? "border-folha bg-folha-soft" : "border-tinta bg-white",
              )}
            >
              <span aria-hidden className="text-lg">
                {guess.emoji}
              </span>
              {guess.name}
            </div>
            {compareCharacters(guess, ANSWER, ATTRIBUTES).map((feedback, col) => (
              <Tile
                key={feedback.key}
                label={ATTRIBUTES[col]!.label}
                feedback={feedback}
                index={col}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Mesmos números do modo Imagem de verdade (zoom e desfoque de cada nível). */
function ImageExample() {
  const levels = [
    { effect: IMAGE_MODE.effects[0]!, caption: "1º chute" },
    { effect: IMAGE_MODE.effects[2]!, caption: "3º chute" },
    { effect: { zoom: 1, blur: 0 }, caption: "Acertou!" },
  ];
  return (
    <ol
      className="grid grid-cols-3 gap-3"
      aria-label="Exemplo: a imagem fica mais nítida a cada erro"
    >
      {levels.map(({ effect, caption }, index) => (
        <li
          key={caption}
          className="flex flex-col items-center gap-1.5 motion-safe:animate-pop"
          style={{ animationDelay: `${index * 700}ms` }}
        >
          <div className="aspect-square w-full overflow-hidden rounded-2xl border-2 border-tinta bg-anil-soft">
            {/* Imagem pública do tema (o borrado aqui é só ilustração). */}
            <img
              src="/temas/fauna-brasileira/capivara.webp"
              alt=""
              width={120}
              height={120}
              className="size-full object-cover"
              style={{ transform: `scale(${effect.zoom})`, filter: `blur(${effect.blur}px)` }}
            />
          </div>
          <span className="text-xs font-semibold text-tinta-soft">{caption}</span>
        </li>
      ))}
    </ol>
  );
}

/** Conteúdo do "Como jogar": abas Clássico e Imagem, 4 passos e um exemplo. */
export function HowToPlayContent({ initialTab = "classic" }: { initialTab?: HelpTab }) {
  const [tab, setTab] = useState<HelpTab>(initialTab);
  const id = useId();
  const tabs: { value: HelpTab; label: string }[] = [
    { value: "classic", label: "Clássico" },
    { value: "image", label: "Imagem" },
  ];

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = tab === "classic" ? "image" : "classic";
    setTab(next);
    document.getElementById(`${id}-${next}`)?.focus();
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div
        role="tablist"
        aria-label="Modo de jogo"
        className="flex gap-1 rounded-xl bg-papel p-1"
        onKeyDown={onKeyDown}
      >
        {tabs.map((item) => (
          <button
            key={item.value}
            id={`${id}-${item.value}`}
            type="button"
            role="tab"
            aria-selected={tab === item.value}
            aria-controls={`${id}-panel`}
            tabIndex={tab === item.value ? 0 : -1}
            onClick={() => setTab(item.value)}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-sm font-semibold",
              tab === item.value
                ? "bg-white shadow-carimbo-sm"
                : "text-tinta-soft hover:text-tinta",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-${tab}`}
        className="flex flex-col gap-4"
      >
        <ol className="flex flex-col gap-2.5">
          {STEPS[tab].map((step, index) => (
            <li key={step} className="flex gap-3 text-sm leading-snug">
              <span
                aria-hidden
                className="font-display flex size-7 shrink-0 items-center justify-center rounded-full bg-gema text-sm"
              >
                {index + 1}
              </span>
              <span className="pt-1">{step}</span>
            </li>
          ))}
        </ol>
        {/* `key` reinicia a animação ao trocar de aba. */}
        <div key={tab}>{tab === "classic" ? <ClassicExample /> : <ImageExample />}</div>
      </div>
    </div>
  );
}

/** Janela do "Como jogar" (dialog nativo: Esc fecha e o foco fica dentro). */
export function HowToPlayDialog({
  open,
  onClose,
  initialTab,
}: {
  open: boolean;
  onClose: () => void;
  initialTab?: HelpTab;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => event.target === ref.current && onClose()}
      className="m-auto w-[min(34rem,calc(100%-2rem))] rounded-3xl border-2 border-tinta bg-white p-0 text-tinta shadow-carimbo backdrop:bg-tinta/50"
    >
      {open ? (
        <div className="flex max-h-[85dvh] flex-col gap-4 overflow-y-auto p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 id={titleId} className="font-display text-2xl">
              Como jogar
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="rounded-lg p-1.5 hover:bg-tinta/5"
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>
          <HowToPlayContent initialTab={initialTab} />
          <Button onClick={onClose} className="self-end">
            Entendi
          </Button>
        </div>
      ) : null}
    </dialog>
  );
}

/** Botão "Como jogar" que abre a janela. `tone="light"` para fundo anil. */
export function HowToPlayButton({
  initialTab,
  tone = "dark",
  className,
}: {
  initialTab?: HelpTab;
  tone?: "light" | "dark";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold",
          tone === "light"
            ? "text-white/85 hover:bg-white/10 hover:text-white"
            : "text-tinta hover:bg-tinta/5",
          className,
        )}
      >
        <CircleHelp aria-hidden className="size-4" />
        Como jogar
      </button>
      <HowToPlayDialog open={open} onClose={() => setOpen(false)} initialTab={initialTab} />
    </>
  );
}

const SEEN_KEY = "chutai:como-jogar-visto";

/** Primeira vez numa sala? (guardado no localStorage; sem acesso a ele, não mostra). */
export function useFirstVisitHelp(): [boolean, () => void] {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) setShow(true);
    } catch {
      // Navegação privada ou armazenamento bloqueado: segue sem o aviso.
    }
  }, []);
  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // idem
    }
  };
  return [show, dismiss];
}
