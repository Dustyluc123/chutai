"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, PartyPopper, Shuffle } from "lucide-react";
import type { Character, CharacterOption, RoundKind, GuessResult, Theme } from "@chutai/shared";
import {
  compareCharacters,
  drawCharacter,
  formatValue,
  MAX_ROUND_IMAGE_LEVEL,
  drawZoomCenter,
  imageLevel,
  imageModeAvailability,
  imageModeCharacters,
  nounPhrases,
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
import { HowToPlayButton } from "@/components/help/how-to-play";
import { playSound } from "@/lib/sound";
import { guessSound } from "@/lib/sound/director";

/** Treino individual: sorteia um personagem e deixa chutar sem limite de tempo. */
export function SoloGame({ theme, options }: { theme: Theme; options: CharacterOption[] }) {
  const [answer, setAnswer] = useState<Character | null>(null);
  const [guesses, setGuesses] = useState<GuessResult[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [played, setPlayed] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<RoundKind>("classic");
  const imageAvailable = supportsImageMode(theme.characters);
  const imageMode = mode === "image" && imageAvailable;
  const [zoomCenter, setZoomCenter] = useState<ZoomCenter>({ x: 0.5, y: 0.5 });
  // No modo Imagem, o autocompletar mostra só o nome (a miniatura entregaria a resposta).
  const partial = imageMode && imageModeAvailability(theme.characters) === "partial";
  // Personagens do jogo: no modo Imagem, só quem tem imagem (no parcial, os outros ficam de fora).
  const poolFor = (value: RoundKind) =>
    value === "image" && imageAvailable ? imageModeCharacters(theme.characters) : theme.characters;
  const visibleOptions = useMemo(() => {
    if (!imageMode) return options;
    const ids = new Set(imageModeCharacters(theme.characters).map((c) => c.id));
    return options
      .filter((option) => ids.has(option.id))
      .map(({ id, name, aliases }) => ({ id, name, aliases }));
  }, [imageMode, options, theme.characters]);

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
    playSound(guessSound(character.id === answer.id));
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

  function next(value: RoundKind = mode) {
    if (!answer) return;
    const used = new Set(played).add(answer.id);
    setPlayed(used);
    setAnswer(drawCharacter(poolFor(value), used));
    setZoomCenter(drawZoomCenter());
    setGuesses([]);
    setRevealed(false);
  }

  function changeMode(value: RoundKind) {
    setMode(value);
    next(value);
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
        <div className="flex flex-wrap gap-2">
          <HowToPlayButton initialTab={mode} className="h-11 px-4" />
          {!finished ? (
            <Button variant="ghost" onClick={() => setRevealed(true)} disabled={!answer}>
              <Eye aria-hidden className="size-4" /> Desistir
            </Button>
          ) : null}
          <Button variant="secondary" onClick={() => next()} disabled={!answer}>
            <Shuffle aria-hidden className="size-4" /> Outro {theme.noun?.singular ?? "personagem"}
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

      {partial ? (
        <p
          role="status"
          className="rounded-2xl border-2 border-gema bg-gema-soft px-3 py-2 text-sm font-semibold"
        >
          Modo Imagem parcial: {imageModeCharacters(theme.characters).length} de{" "}
          {theme.characters.length} personagens têm imagem. Os outros ficam de fora.
        </p>
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
                nounPhrases(theme.noun).itWas
              )}
            </p>
            <p className="font-display text-3xl">{answer.name}</p>
            <p className="text-sm text-tinta-soft">
              {theme.attributes
                .map((attr) => `${attr.label}: ${formatValue(attr, answer.values[attr.key])}`)
                .join(". ")}
            </p>
          </div>
          <Button onClick={() => next()}>Jogar de novo</Button>
        </section>
      ) : (
        <GuessInput
          options={visibleOptions}
          guessedIds={guessedIds}
          showPictures={!imageMode}
          noun={theme.noun}
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
            noun={theme.noun}
            emptyMessage={`Chute ${nounPhrases(theme.noun).any}. As cores mostram o quanto você chegou perto.`}
          />
        </>
      )}
    </>
  );
}
