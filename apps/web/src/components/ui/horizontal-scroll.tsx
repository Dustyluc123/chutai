"use client";

import { ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface HorizontalScrollProps {
  children: ReactNode;
  className?: string;
  /** Classes da área que rola (ex.: margens negativas para encostar na borda da tela). */
  scrollClassName?: string;
  /** Cor do degradê da borda direita: a mesma do fundo atrás do conteúdo. */
  fadeFrom?: "papel" | "white" | "anil";
}

const FADE = {
  papel: "from-papel",
  white: "from-white",
  anil: "from-anil",
} as const;

/**
 * Conteúdo largo que rola para o lado (o tabuleiro no celular). Enquanto ainda há coisa à
 * direita, mostra um degradê e "Arraste" na borda, para ficar claro que dá para arrastar;
 * some quando chega ao fim. No computador, se tudo couber, não aparece nada.
 */
export function HorizontalScroll({
  children,
  className,
  scrollClassName,
  fadeFrom = "papel",
}: HorizontalScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setMore(el.scrollWidth - el.clientWidth - el.scrollLeft > 8);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    // Navegadores antigos (e o jsdom dos testes) não têm ResizeObserver: mede só ao rolar.
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div className={cn("relative", className)}>
      <div ref={ref} onScroll={measure} className={cn("overflow-x-auto", scrollClassName)}>
        {children}
      </div>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 flex w-16 items-start justify-end bg-gradient-to-l to-transparent pt-0.5 transition-opacity duration-300",
          FADE[fadeFrom],
          more ? "opacity-100" : "opacity-0",
        )}
      >
        <span className="inline-flex items-center gap-0.5 rounded-full border-2 border-tinta bg-gema px-2 py-0.5 text-xs font-bold text-tinta shadow-carimbo-sm">
          Arraste <ChevronRight className="size-3.5" strokeWidth={3} />
        </span>
      </div>
    </div>
  );
}
