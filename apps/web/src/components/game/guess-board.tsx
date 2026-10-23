import type { CSSProperties } from "react";
import type { GuessResult, ThemeNoun } from "@chutai/shared";
import { CharacterPicture } from "@/components/ui/character-picture";
import { cn } from "@/lib/cn";
import { HorizontalScroll } from "@/components/ui/horizontal-scroll";
import { Legend } from "./legend";
import { Tile } from "./tile";

interface GuessBoardProps {
  attributes: { key: string; label: string }[];
  /** Do mais antigo para o mais novo; o tabuleiro mostra o mais novo em cima. */
  guesses: GuessResult[];
  /** Anima a fileira mais nova (quando acabou de chegar). */
  animateLatest?: boolean;
  emptyMessage?: string;
  className?: string;
  /** Palavra do tema para o que se adivinha (padrão: personagem). */
  noun?: ThemeNoun;
}

/** Tabuleiro de palpites: uma coluna por atributo do tema, uma fileira por chute. */
export function GuessBoard({
  attributes,
  guesses,
  animateLatest,
  emptyMessage,
  className,
  noun,
}: GuessBoardProps) {
  // Computador: as colunas dividem a largura. Celular: largura fixa e compacta (o texto quebra
  // em linhas), com a coluna do nome presa à esquerda enquanto o resto rola para o lado.
  // (Com `fr` no celular, uma coluna de texto comprido, como a lista de biomas, esticava todas.)
  const columns = {
    "--board-cols": `minmax(8rem, 1.3fr) repeat(${attributes.length}, minmax(5rem, 1fr))`,
    "--board-cols-mobile": `5.75rem repeat(${attributes.length}, 5.5rem)`,
  } as CSSProperties;
  const grid =
    "grid gap-1.5 [grid-template-columns:var(--board-cols-mobile)] sm:gap-2 sm:[grid-template-columns:var(--board-cols)]";
  // Fica por cima das peças que passam por baixo ao arrastar (e cobre a margem à esquerda).
  const sticky =
    "max-sm:sticky max-sm:left-0 max-sm:z-10 max-sm:shadow-[-1.25rem_0_0_var(--color-papel)]";
  const rows = [...guesses].reverse();

  // Antes do primeiro chute: só a frase e as cores, fora da área que rola para o lado
  // (no celular, a frase ficava cortada dentro do tabuleiro).
  if (rows.length === 0) {
    return emptyMessage ? (
      <div
        className={cn(
          "flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-linha px-4 py-6 text-center",
          className,
        )}
      >
        <p className="font-semibold text-tinta">{emptyMessage}</p>
        <Legend className="justify-center" tapTip={false} />
      </div>
    ) : null;
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <HorizontalScroll scrollClassName="px-4 pb-2 sm:px-0" className="-mx-4 sm:mx-0">
        <div
          role="table"
          aria-label="Seus palpites"
          className="flex w-max flex-col gap-1.5 pr-4 sm:w-auto sm:gap-2 sm:pr-0"
        >
          <div role="row" className={grid} style={columns}>
            <div
              role="columnheader"
              className={cn("bg-papel px-1 text-xs font-semibold text-tinta-soft", sticky)}
            >
              {(noun?.singular ?? "personagem").replace(/^./, (c) => c.toUpperCase())}
            </div>
            {attributes.map((attr) => (
              <div
                key={attr.key}
                role="columnheader"
                lang="pt-BR"
                className="px-1 text-center text-xs leading-tight font-semibold [overflow-wrap:anywhere] hyphens-auto text-tinta-soft"
              >
                {attr.label}
              </div>
            ))}
          </div>

          {rows.map((guess, rowIndex) => {
            const animate = animateLatest && rowIndex === 0;
            return (
              <div key={guess.characterId} role="row" className={grid} style={columns}>
                <div
                  role="rowheader"
                  className={cn(
                    "flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border-2 px-1.5 py-1.5 text-center sm:flex-row sm:justify-start sm:gap-2 sm:px-2.5 sm:py-2 sm:text-left",
                    guess.correct ? "border-folha bg-folha-soft" : "border-tinta bg-white",
                    animate && "animate-pop",
                    sticky,
                  )}
                >
                  <CharacterPicture
                    name={guess.characterName}
                    image={guess.image}
                    emoji={guess.emoji}
                    size="board"
                    decorative
                  />
                  <span
                    lang="pt-BR"
                    className="text-xs leading-tight font-semibold [overflow-wrap:anywhere] hyphens-auto sm:text-sm"
                  >
                    {guess.characterName}
                  </span>
                </div>
                {guess.feedback.map((feedback, index) => (
                  <Tile
                    key={feedback.key}
                    label={attributes[index]?.label ?? feedback.key}
                    feedback={feedback}
                    index={index + 1}
                    animate={animate}
                    noun={noun}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </HorizontalScroll>
      <Legend
        unknown={guesses.some((guess) => guess.feedback.some((f) => f.status === "unknown"))}
      />
    </div>
  );
}
