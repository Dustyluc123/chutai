"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, PartyPopper, Shuffle } from "lucide-react";
import type { Character, CharacterOption, GuessResult, Theme } from "@chutai/shared";
import { compareCharacters, drawCharacter, formatValue } from "@chutai/game";
import { Button } from "@/components/ui/button";
import { GuessBoard } from "./guess-board";
import { GuessInput } from "./guess-input";
import { Legend } from "./legend";

/** Treino individual: sorteia um personagem e deixa chutar sem limite de tempo. */
export function SoloGame({ theme, options }: { theme: Theme; options: CharacterOption[] }) {
  const [answer, setAnswer] = useState<Character | null>(null);
  const [guesses, setGuesses] = useState<GuessResult[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [played, setPlayed] = useState<Set<string>>(new Set());

  // Sorteio só no navegador (evita diferença entre servidor e cliente na hidratação).
  useEffect(() => {
    setAnswer(drawCharacter(theme.characters, new Set()));
  }, [theme]);

  const guessedIds = useMemo(() => new Set(guesses.map((g) => g.characterId)), [guesses]);
  const solved = guesses.some((g) => g.correct);
  const finished = solved || revealed;

  function guess(id: string) {
    if (!answer) return;
    const character = theme.characters.find((c) => c.id === id);
    if (!character) return;
    setGuesses((current) => [
      ...current,
      {
        characterId: character.id,
        characterName: character.name,
        emoji: character.emoji,
        feedback: compareCharacters(character, answer, theme.attributes),
        correct: character.id === answer.id,
        guessNumber: current.length + 1,
      },
    ]);
  }

  function next() {
    if (!answer) return;
    const used = new Set(played).add(answer.id);
    setPlayed(used);
    setAnswer(drawCharacter(theme.characters, used));
    setGuesses([]);
    setRevealed(false);
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-tinta-soft">Treino sozinho, sem tempo</p>
          <h1 className="font-display text-4xl sm:text-5xl">
            <span aria-hidden>{theme.emoji}</span> {theme.name}
          </h1>
        </div>
        <div className="flex gap-2">
          {!finished ? (
            <Button variant="ghost" onClick={() => setRevealed(true)} disabled={!answer}>
              <Eye aria-hidden className="size-4" /> Desistir
            </Button>
          ) : null}
          <Button variant="secondary" onClick={next} disabled={!answer}>
            <Shuffle aria-hidden className="size-4" /> Outro personagem
          </Button>
        </div>
      </div>

      {finished && answer ? (
        <section
          aria-live="polite"
          className={
            "flex animate-pop flex-col gap-3 rounded-3xl border-2 p-5 sm:flex-row sm:items-center sm:gap-5 " +
            (solved ? "border-folha bg-folha-soft" : "border-tinta bg-white")
          }
        >
          <span aria-hidden className="text-6xl leading-none">
            {answer.emoji}
          </span>
          <div className="flex flex-1 flex-col gap-1">
            <p className="flex items-center gap-2 font-semibold">
              {solved ? (
                <>
                  <PartyPopper aria-hidden className="size-5 text-folha" /> Acertou em{" "}
                  {guesses.length} {guesses.length === 1 ? "chute" : "chutes"}!
                </>
              ) : (
                "O personagem era"
              )}
            </p>
            <p className="font-display text-3xl">{answer.name}</p>
            <p className="text-sm text-tinta-soft">
              {theme.attributes
                .map((attr) => `${attr.label}: ${formatValue(attr, answer.values[attr.key])}`)
                .join(". ")}
            </p>
          </div>
          <Button onClick={next}>Jogar de novo</Button>
        </section>
      ) : (
        <GuessInput
          options={options}
          guessedIds={guessedIds}
          onGuess={guess}
          disabled={!answer}
          autoFocus
        />
      )}

      <GuessBoard
        attributes={theme.attributes}
        guesses={guesses}
        animateLatest
        emptyMessage="Chute qualquer personagem para começar. As cores mostram o que bate com o personagem secreto."
      />
      <Legend />
    </>
  );
}
