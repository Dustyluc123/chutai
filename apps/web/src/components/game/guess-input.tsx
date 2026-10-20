"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Search } from "lucide-react";
import type { CharacterOption } from "@chutai/shared";
import { searchCharacters } from "@chutai/game";
import { CharacterPicture } from "@/components/ui/character-picture";
import { cn } from "@/lib/cn";

interface GuessInputProps {
  options: CharacterOption[];
  /** Ids já chutados: somem da lista. */
  guessedIds: ReadonlySet<string>;
  onGuess: (characterId: string) => Promise<void> | void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  /**
   * false no modo Imagem: só o nome, sem imagem nem emoji (a miniatura entregaria a resposta).
   * Padrão: true.
   */
  showPictures?: boolean;
}

/**
 * Campo de palpite com autocompletar (padrão combobox do WAI-ARIA):
 * setas navegam, Enter chuta, Esc fecha. Ignora acentos ("onca" acha "Onça").
 */
export function GuessInput({
  options,
  guessedIds,
  onGuess,
  disabled,
  placeholder = "Digite um nome…",
  autoFocus,
  showPictures = true,
}: GuessInputProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);

  const results = useMemo(
    () => searchCharacters(options, query, guessedIds, 7),
    [options, query, guessedIds],
  );

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    if (!disabled && autoFocus) inputRef.current?.focus();
  }, [disabled, autoFocus]);

  async function choose(option: CharacterOption | undefined) {
    if (!option || busy) return;
    setBusy(true);
    try {
      await onGuess(option.id);
      setQuery("");
      setOpen(false);
    } catch {
      setShake(true);
      setTimeout(() => setShake(false), 450);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      void choose(results[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && query.trim().length > 0 && !disabled;
  const activeId = results[active] ? `${listId}-${results[active].id}` : undefined;

  return (
    <div className={cn("relative", shake && "animate-shake")}>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-tinta-soft"
      />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label="Chutar um personagem"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList ? activeId : undefined}
        autoComplete="off"
        spellCheck={false}
        disabled={disabled || busy}
        placeholder={placeholder}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        className="h-14 w-full rounded-2xl border-2 border-tinta bg-white pr-4 pl-12 text-lg font-medium shadow-carimbo-sm placeholder:text-tinta-soft/60 focus:outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-chiclete disabled:cursor-not-allowed disabled:bg-papel disabled:shadow-none"
      />

      {showList ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Personagens"
          className="absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-auto rounded-2xl border-2 border-tinta bg-white p-1.5 shadow-carimbo"
        >
          {results.length === 0 ? (
            <li className="px-3 py-3 text-sm text-tinta-soft">
              Nenhum personagem com esse nome (ou você já chutou).
            </li>
          ) : (
            results.map((option, index) => (
              <li
                key={option.id}
                id={`${listId}-${option.id}`}
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => void choose(option)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-1.5",
                  index === active ? "bg-gema" : "hover:bg-papel",
                )}
              >
                {showPictures ? (
                  <CharacterPicture
                    name={option.name}
                    image={option.image}
                    emoji={option.emoji}
                    size="md"
                    decorative
                  />
                ) : null}
                <span className="font-semibold">{option.name}</span>
                {option.aliases.length ? (
                  <span className="truncate text-sm text-tinta-soft">
                    {option.aliases.join(", ")}
                  </span>
                ) : null}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
