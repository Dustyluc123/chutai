import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Tile } from "@/components/game/tile";
import { HintBar } from "@/components/game/hint-bar";
import { GuessBoard } from "@/components/game/guess-board";
import { HowToPlayContent, useFirstVisitHelp } from "@/components/help/how-to-play";

afterEach(cleanup);

describe("peças do tabuleiro explicam o que querem dizer", () => {
  it("leitor de tela lê a explicação e o toque mostra o balão", () => {
    render(
      <div role="table">
        <div role="row">
          <Tile
            label="Nascimento"
            feedback={{ key: "nascimento", display: "1993", status: "wrong", direction: "down" }}
          />
        </div>
      </div>,
    );
    const button = screen.getByRole("button", {
      name: "Nascimento: 1993. O do personagem secreto é antes de 1993.",
    });
    expect(screen.queryByRole("tooltip", { hidden: true })).toBeNull();
    fireEvent.click(button);
    expect(screen.getByRole("tooltip", { hidden: true }).textContent).toContain("antes de 1993");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("tooltip", { hidden: true })).toBeNull();
  });
});

describe("textos para quem nunca jogou", () => {
  it("antes do primeiro chute, a frase aparece no lugar do tabuleiro", () => {
    render(
      <GuessBoard
        attributes={[{ key: "a", label: "A" }]}
        guesses={[]}
        emptyMessage="Chute qualquer personagem. As cores mostram o quanto você chegou perto."
      />,
    );
    expect(screen.getByText(/As cores mostram o quanto você chegou perto/)).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("dica: diz quando libera e quanto custa", () => {
    render(<HintBar enabled guessCount={1} hints={[]} solved={false} onRequest={() => {}} />);
    expect(screen.getByText("Dica liberada em 2 chutes.")).toBeTruthy();
    expect(screen.getAllByText("−150 pontos")).toHaveLength(2);
  });

  it("como jogar: abas Clássico e Imagem", () => {
    render(<HowToPlayContent />);
    expect(screen.getByRole("tab", { name: "Clássico" }).getAttribute("aria-selected")).toBe(
      "true",
    );
    fireEvent.click(screen.getByRole("tab", { name: "Imagem" }));
    expect(screen.getByText(/Aparece um pedaço borrado/)).toBeTruthy();
  });
});

describe("primeira vez numa sala", () => {
  beforeEach(() => localStorage.clear());

  function Probe() {
    const [show, dismiss] = useFirstVisitHelp();
    return show ? <button onClick={dismiss}>fechar</button> : <p>sem ajuda</p>;
  }

  it("mostra uma vez e lembra depois de fechar", async () => {
    const first = render(<Probe />);
    await act(async () => {});
    fireEvent.click(screen.getByText("fechar"));
    expect(localStorage.getItem("chutai:como-jogar-visto")).toBe("1");
    first.unmount();
    render(<Probe />);
    await act(async () => {});
    expect(screen.getByText("sem ajuda")).toBeTruthy();
  });
});
