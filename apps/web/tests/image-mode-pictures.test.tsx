/**
 * Modo Imagem: os componentes de palpite mostram só o nome, sem imagem e sem emoji.
 * Os dados de teste trazem imagem e emoji de propósito, para provar que nada passa.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { CharacterOption, GuessResult } from "@chutai/shared";
import { GuessInput } from "@/components/game/guess-input";
import { GuessList } from "@/components/game/guess-list";

afterEach(cleanup);

const options: CharacterOption[] = [
  {
    id: "capivara",
    name: "Capivara",
    aliases: [],
    emoji: "🦫",
    image: "/temas/fauna-brasileira/capivara.webp",
  },
  {
    id: "cutia",
    name: "Cutia",
    aliases: [],
    emoji: "🐹",
    image: "/temas/fauna-brasileira/cutia.webp",
  },
];

const guesses: GuessResult[] = [
  {
    characterId: "cutia",
    characterName: "Cutia",
    emoji: "🐹",
    image: "/temas/fauna-brasileira/cutia.webp",
    feedback: [],
    correct: false,
    guessNumber: 1,
  },
];

function openList(container: HTMLElement) {
  const input = screen.getByRole("combobox");
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "c" } });
  expect(screen.getAllByRole("option").length).toBe(2);
  return container;
}

describe("GuessInput", () => {
  it("no modo Imagem o autocompletar não tem imagem nem emoji", () => {
    const { container } = render(
      <GuessInput
        options={options}
        guessedIds={new Set()}
        onGuess={() => {}}
        showPictures={false}
      />,
    );
    openList(container);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).not.toMatch(/🦫|🐹|❔/u);
    expect(screen.getByText("Capivara")).toBeTruthy();
  });

  it("no Clássico o autocompletar continua com as imagens", () => {
    const { container } = render(
      <GuessInput options={options} guessedIds={new Set()} onGuess={() => {}} />,
    );
    openList(container);
    expect(container.querySelectorAll("img").length).toBe(2);
  });
});

describe("GuessList", () => {
  it("no modo Imagem os palpites já feitos mostram só o nome", () => {
    const { container } = render(<GuessList guesses={guesses} showPictures={false} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).not.toMatch(/🐹|❔/u);
    expect(screen.getByText("Cutia")).toBeTruthy();
  });

  it("no Clássico a lista mostra a imagem", () => {
    const { container } = render(<GuessList guesses={guesses} />);
    expect(container.querySelector("img")).not.toBeNull();
  });
});
