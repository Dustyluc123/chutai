"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { AttributeFeedback } from "@chutai/shared";
import { explainFeedback } from "@chutai/game";
import { STATUS_STYLES } from "@/lib/colors";
import { cn } from "@/lib/cn";

interface TileProps {
  label: string;
  feedback: AttributeFeedback;
  /** Posição na fileira, para a animação virar uma peça de cada vez. */
  index?: number;
  animate?: boolean;
  /** Fora de um tabuleiro (ex.: legenda, exemplo), a peça é só uma imagem com descrição. */
  standalone?: boolean;
}

const BASE =
  "relative flex min-h-16 w-full flex-col items-center justify-center rounded-xl border-2 px-1.5 py-2 text-center text-[13px] leading-tight font-semibold";

/**
 * Uma peça do tabuleiro: valor do personagem chutado + cor do resultado (+ seta em números).
 * No tabuleiro, a peça é um botão: passar o mouse, tocar ou focar mostra o que ela quer dizer
 * ("Nascimento: 1993. O do personagem secreto é antes de 1993."). O leitor de tela lê a mesma frase.
 */
export function Tile({ label, feedback, index = 0, animate, standalone }: TileProps) {
  const explanation = explainFeedback(label, feedback);
  const style = animate ? { animationDelay: `${index * 110}ms` } : undefined;
  const content = (
    <>
      <span className="break-words hyphens-auto" lang="pt-BR">
        {feedback.display}
      </span>
      {feedback.direction ? (
        <span
          aria-hidden
          className="mt-1 inline-flex items-center rounded-full bg-black/15 px-1.5 py-0.5"
        >
          {feedback.direction === "up" ? (
            <ArrowUp className="size-3.5" strokeWidth={3} />
          ) : (
            <ArrowDown className="size-3.5" strokeWidth={3} />
          )}
        </span>
      ) : null}
    </>
  );

  if (standalone) {
    return (
      <div
        role="img"
        aria-label={explanation}
        style={style}
        className={cn(BASE, STATUS_STYLES[feedback.status], animate && "animate-flip")}
      >
        {content}
      </div>
    );
  }

  return (
    <div role="cell" className="flex">
      <ExplainButton
        explanation={explanation}
        style={style}
        className={cn(
          BASE,
          STATUS_STYLES[feedback.status],
          "cursor-help focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-tinta",
          animate && "animate-flip",
        )}
      >
        {content}
      </ExplainButton>
    </div>
  );
}

interface TipPosition {
  x: number;
  y: number;
  below: boolean;
}

/** Botão com balão explicativo (mouse, toque e teclado). O balão vai para o <body>. */
function ExplainButton({
  explanation,
  className,
  style,
  children,
}: {
  explanation: string;
  className: string;
  style?: React.CSSProperties;
  children: ReactNode;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [tip, setTip] = useState<TipPosition | null>(null);

  const open = () => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const below = rect.top < 110; // sem espaço em cima: mostra embaixo
    setTip({
      x: rect.left + rect.width / 2,
      y: below ? rect.bottom + 8 : rect.top - 8,
      below,
    });
  };
  const close = () => setTip(null);

  useEffect(() => {
    if (!tip) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    // Rolar a página ou o tabuleiro tira a peça do lugar: fecha o balão.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [tip]);

  const half = 136; // metade da largura máxima do balão + margem
  const left =
    tip && typeof window !== "undefined"
      ? Math.min(Math.max(tip.x, half), window.innerWidth - half)
      : 0;

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={explanation}
        style={style}
        className={className}
        onPointerEnter={(event) => event.pointerType === "mouse" && open()}
        onPointerLeave={(event) => event.pointerType === "mouse" && close()}
        onFocus={(event) => event.currentTarget.matches(":focus-visible") && open()}
        onBlur={close}
        onClick={() => (tip ? close() : open())}
      >
        {children}
      </button>
      {tip
        ? createPortal(
            <div
              role="tooltip"
              aria-hidden
              style={{
                position: "fixed",
                left,
                top: tip.y,
                transform: tip.below ? "translate(-50%, 0)" : "translate(-50%, -100%)",
              }}
              className="pointer-events-none z-50 w-max max-w-64 animate-pop rounded-xl border-2 border-tinta bg-white px-3 py-2 text-left text-sm leading-snug font-semibold text-tinta shadow-carimbo-sm"
            >
              {explanation}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
