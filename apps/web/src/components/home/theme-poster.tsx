import Link from "next/link";
import type { ThemeSummary } from "@chutai/shared";
import { nounPhrases } from "@chutai/game";
import { THEME_COLORS } from "@/lib/colors";
import { cn } from "@/lib/cn";

/** Cartaz de um tema: bloco de cor com emoji grande "colado" no canto, inspirado em lambe-lambe. */
export function ThemePoster({ theme, className }: { theme: ThemeSummary; className?: string }) {
  const color = THEME_COLORS[theme.color];
  return (
    <article
      className={cn(
        "group relative flex min-h-72 flex-col justify-between gap-8 overflow-hidden rounded-3xl border-2 border-tinta p-6",
        color.bg,
        color.text,
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-5 -right-5 rotate-12 text-[7.5rem] leading-none transition-transform duration-300 select-none group-hover:rotate-0"
      >
        {theme.emoji}
      </span>
      <div className="relative flex flex-col gap-2 pr-20">
        <h3 className="font-display text-[1.6rem] leading-tight text-balance sm:text-3xl">
          {theme.name}
        </h3>
        <p className="text-sm font-medium opacity-90">{theme.description}</p>
      </div>
      <div className="relative flex flex-col gap-3">
        <p className="text-sm font-semibold">
          {nounPhrases(theme.noun).count(theme.characterCount)}, {theme.attributes.length} atributos
        </p>
        <div className="flex flex-wrap gap-2">
          {/* Link comum (recarrega) para o cartão inicial ler o ?tema= da URL. */}
          <a
            href={`/?tema=${theme.slug}#comecar`}
            className="inline-flex min-h-11 items-center rounded-xl border-2 border-tinta bg-white px-3.5 py-2 text-sm font-bold text-tinta shadow-carimbo-sm hover:-translate-y-px"
          >
            Criar sala
          </a>
          <Link
            href={`/temas/${theme.slug}`}
            className="inline-flex min-h-11 items-center rounded-xl border-2 border-current px-3.5 py-2 text-sm font-bold hover:bg-white/15"
          >
            Ver personagens
          </Link>
        </div>
      </div>
    </article>
  );
}
