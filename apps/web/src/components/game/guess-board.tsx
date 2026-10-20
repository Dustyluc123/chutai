import type { GuessResult } from "@chutai/shared";
import { CharacterPicture } from "@/components/ui/character-picture";
import { cn } from "@/lib/cn";
import { Tile } from "./tile";

interface GuessBoardProps {
  attributes: { key: string; label: string }[];
  /** Do mais antigo para o mais novo; o tabuleiro mostra o mais novo em cima. */
  guesses: GuessResult[];
  /** Anima a fileira mais nova (quando acabou de chegar). */
  animateLatest?: boolean;
  emptyMessage?: string;
  className?: string;
}

/** Tabuleiro de palpites: uma coluna por atributo do tema, uma fileira por chute. */
export function GuessBoard({
  attributes,
  guesses,
  animateLatest,
  emptyMessage,
  className,
}: GuessBoardProps) {
  const columns = `minmax(8rem, 1.3fr) repeat(${attributes.length}, minmax(5rem, 1fr))`;
  const rows = [...guesses].reverse();

  return (
    <div className={cn("-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0", className)}>
      <div
        role="table"
        aria-label="Seus palpites"
        className="flex min-w-max flex-col gap-2 sm:min-w-0"
      >
        <div role="row" className="grid gap-2" style={{ gridTemplateColumns: columns }}>
          <div role="columnheader" className="px-1 text-xs font-semibold text-tinta-soft">
            Personagem
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

        {rows.length === 0 && emptyMessage ? (
          <p className="rounded-xl border-2 border-dashed border-linha px-4 py-8 text-center text-sm text-tinta-soft">
            {emptyMessage}
          </p>
        ) : null}

        {rows.map((guess, rowIndex) => {
          const animate = animateLatest && rowIndex === 0;
          return (
            <div
              key={guess.characterId}
              role="row"
              className="grid gap-2"
              style={{ gridTemplateColumns: columns }}
            >
              <div
                role="rowheader"
                className={cn(
                  "flex min-h-16 items-center gap-2 rounded-xl border-2 px-2.5 py-2",
                  guess.correct ? "border-folha bg-folha-soft" : "border-tinta bg-white",
                  animate && "animate-pop",
                )}
              >
                <CharacterPicture
                  name={guess.characterName}
                  image={guess.image}
                  emoji={guess.emoji}
                  size="md"
                  decorative
                />
                <span className="text-sm leading-tight font-semibold">{guess.characterName}</span>
              </div>
              {guess.feedback.map((feedback, index) => (
                <Tile
                  key={feedback.key}
                  label={attributes[index]?.label ?? feedback.key}
                  feedback={feedback}
                  index={index + 1}
                  animate={animate}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
