"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/cn";

/** "Ver todos (N)" / "Mostrar menos" para as listas longas de jogadores (salas de live). */
export function ShowAllButton({
  hidden,
  expanded,
  onToggle,
  className,
  tone = "dark",
}: {
  hidden: number;
  expanded: boolean;
  onToggle: () => void;
  className?: string;
  tone?: "dark" | "light";
}) {
  if (!expanded && hidden === 0) return null;
  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={onToggle}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-1.5 self-center rounded-xl px-4 text-sm font-semibold",
        tone === "dark"
          ? "text-tinta-soft hover:bg-tinta/5 hover:text-tinta"
          : "text-white/85 hover:bg-white/10",
        className,
      )}
    >
      {expanded ? (
        <>
          <ChevronUp aria-hidden className="size-4" /> Mostrar menos
        </>
      ) : (
        <>
          <ChevronDown aria-hidden className="size-4" /> Ver todos (mais {hidden})
        </>
      )}
    </button>
  );
}
