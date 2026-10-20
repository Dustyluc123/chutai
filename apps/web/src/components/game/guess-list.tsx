import { Check, X } from "lucide-react";
import type { GuessResult } from "@chutai/shared";
import { CharacterPicture } from "@/components/ui/character-picture";
import { cn } from "@/lib/cn";

interface GuessListProps {
  /** Do mais antigo para o mais novo; a lista mostra o mais novo primeiro. */
  guesses: GuessResult[];
  emptyMessage?: string;
  className?: string;
  /** false no modo Imagem: só o nome, sem imagem nem emoji. Padrão: true. */
  showPictures?: boolean;
}

/** Modo Imagem: só a lista de chutes (sem atributos), com quem acertou em verde. */
export function GuessList({
  guesses,
  emptyMessage,
  className,
  showPictures = true,
}: GuessListProps) {
  if (guesses.length === 0) {
    return emptyMessage ? (
      <p
        className={cn(
          "rounded-xl border-2 border-dashed border-linha px-4 py-6 text-center text-sm text-tinta-soft",
          className,
        )}
      >
        {emptyMessage}
      </p>
    ) : null;
  }

  return (
    <ol aria-label="Seus chutes" className={cn("flex flex-wrap gap-2", className)}>
      {[...guesses].reverse().map((guess, index) => (
        <li
          key={guess.characterId}
          className={cn(
            "flex items-center gap-2 rounded-xl border-2 py-1 pr-3",
            showPictures ? "pl-1" : "py-1.5 pl-3",
            guess.correct ? "border-folha bg-folha-soft" : "border-tinta bg-white",
            index === 0 && "animate-pop",
          )}
        >
          {showPictures ? (
            <CharacterPicture
              name={guess.characterName}
              image={guess.image}
              emoji={guess.emoji}
              size="sm"
              decorative
            />
          ) : null}
          <span className="text-sm font-semibold">{guess.characterName}</span>
          {guess.correct ? (
            <Check aria-label="acertou" className="size-4 text-folha" strokeWidth={3} />
          ) : (
            <X aria-label="errou" className="size-4 text-pitanga" strokeWidth={3} />
          )}
        </li>
      ))}
    </ol>
  );
}
