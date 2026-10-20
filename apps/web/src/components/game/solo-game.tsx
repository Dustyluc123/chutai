"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, PartyPopper, Shuffle } from "lucide-react";
import type { Character, CharacterOption, GameMode, GuessResult, Theme } from "@chutai/shared";
import {
  compareCharacters,
  drawCharacter,
  formatValue,
  MAX_ROUND_IMAGE_LEVEL,
  drawZoomCenter,
  imageLevel,
  supportsImageMode,
  type ZoomCenter,
} from "@chutai/game";
import { Button } from "@/components/ui/button";
import { CharacterPicture } from "@/components/ui/character-picture";
import { OptionGroup } from "@/components/ui/option-group";
import { GuessBoard } from "./guess-board";
import { GuessInput } from "./guess-input";
import { GuessList } from "./guess-list";
import { PixelatedImage } from "./pixelated-image";
import { Legend } from "./legend";

/** Treino individual: sorteia um personagem e deixa chutar sem limite de tempo. */
export function SoloGame({ theme, options }: { theme: Theme; options: CharacterOption[] }) {
  const [answer, setAnswer] = useState<Character | null>(null);
  const [guesses, setGuesses] = useState<GuessResult[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [played, setPlayed] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<GameMode>("classic");
  const imageAvailable = supportsImageMode(theme.characters);
  const imageMode = mode === "image" && imageAvailable;
  const [zoomCenter, setZoomCenter] = useState<ZoomCenter>({ x: 0.5, y: 0.5 });
  // No modo Imagem, o autocompletar mostra só o nome (a miniatura entregaria a resposta).
  const visibleOptions = useMemo(
    () => (imageMode ? options.map(({ id, name, aliases }) => ({ id, name, aliases })) : options),
    [imageMode, options],
  );

  // Sorteio só no navegador (evita diferença entre servidor e cliente na hidratação).
  useEffect(() => {
    setAnswer(drawCharacter(theme.characters, new Set()));
    setZoomCenter(drawZoomCenter());
  }, [theme]);

  const guessedIds = useMemo(() => new Set(guesses.map((g) => g.characterId)), [guesses]);
  const solved = guesses.some((g) => g.correct);
  const finished = solved || revealed;
  const level = imageLevel({
    wrongGuesses: guesses.filter((g) => !g.correct).length,
    hintsUsed: 0,
  });

  function guess(id: string) {
    if (!answer) return;
    const character = theme.characters.find((c) => c.id === id);
    if (!character) return;
    setGuesses((current) => [
      ...current,
      {
        characterId: character.id,
        characterName: character.name,
        ...(imageMode ? {} : { emoji: character.emoji, image: character.image }),
        feedback: imageMode ? [] : compareCharacters(character, answer, theme.attributes),
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
    setZoomCenter(drawZoomCenter());
    setGuesses([]);
    setRevealed(false);
  }

  function changeMode(value: GameMode) {
    setMode(value);
    next();
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

      {imageAvailable ? (
        <OptionGroup
          label="Modo"
          value={mode}
          options={[
            { value: "classic", label: "Clássico" },
            { value: "image", label: "Imagem" },
          ]}
          onChange={changeMode}
        />
      ) : null}

      {imageMode && answer?.image && !finished ? (
        <div className="aspect-square w-full max-w-[300px] self-center overflow-hidden rounded-3xl border-2 border-tinta bg-anil-soft shadow-carimbo">
          <PixelatedImage
            src={answer.image}
            level={level}
            center={zoomCenter}
            label={`Imagem misteriosa do personagem, borrada. Nitidez ${level + 1} de ${MAX_ROUND_IMAGE_LEVEL + 1}.`}
          />
        </div>
      ) : null}

      {finished && answer ? (
        <section
          aria-live="polite"
          className={
            "flex animate-pop flex-col gap-3 rounded-3xl border-2 p-5 sm:flex-row sm:items-center sm:gap-5 " +
            (solved ? "border-folha bg-folha-soft" : "border-tinta bg-white")
          }
        >
          <CharacterPicture
            name={answer.name}
            image={answer.image}
            emoji={answer.emoji}
            size="xl"
          />
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
          options={visibleOptions}
          guessedIds={guessedIds}
          showPictures={!imageMode}
          onGuess={guess}
          disabled={!answer}
          autoFocus
        />
      )}

      {imageMode ? (
        <GuessList
          guesses={guesses}
          showPictures={false}
          emptyMessage="Quem é? Chute pelo nome. Cada erro deixa a imagem um pouco mais nítida."
        />
      ) : (
        <>
          <GuessBoard
            attributes={theme.attributes}
            guesses={guesses}
            animateLatest
            emptyMessage="Chute qualquer personagem para começar. As cores mostram o que bate com o personagem secreto."
          />
          <Legend />
        </>
      )}
    </>
  );
}
