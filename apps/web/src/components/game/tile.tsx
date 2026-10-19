import { ArrowDown, ArrowUp } from "lucide-react";
import type { AttributeFeedback } from "@chutai/shared";
import { STATUS_LABEL, STATUS_STYLES } from "@/lib/colors";
import { cn } from "@/lib/cn";

interface TileProps {
  label: string;
  feedback: AttributeFeedback;
  /** Posição na fileira, para a animação virar uma peça de cada vez. */
  index?: number;
  animate?: boolean;
  /** Fora de um tabuleiro (ex.: legenda), a peça é só uma imagem com descrição. */
  standalone?: boolean;
}

/** Uma peça do tabuleiro: valor do personagem chutado + cor do resultado (+ seta em números). */
export function Tile({ label, feedback, index = 0, animate, standalone }: TileProps) {
  const direction =
    feedback.direction === "up"
      ? "a resposta é maior"
      : feedback.direction === "down"
        ? "a resposta é menor"
        : "";
  return (
    <div
      role={standalone ? "img" : "cell"}
      aria-label={`${label}: ${feedback.display}, ${STATUS_LABEL[feedback.status]}${direction ? `, ${direction}` : ""}`}
      style={animate ? { animationDelay: `${index * 110}ms` } : undefined}
      className={cn(
        "relative flex min-h-16 flex-col items-center justify-center rounded-xl border-2 px-1.5 py-2 text-center text-[13px] leading-tight font-semibold",
        STATUS_STYLES[feedback.status],
        animate && "animate-flip",
      )}
    >
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
    </div>
  );
}
