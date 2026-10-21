import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BetweenRoundsCountdown, StartCountdown } from "@/components/game/countdown";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("contagem regressiva", () => {
  it("largada: mostra o número e anuncia para leitores de tela", () => {
    vi.useFakeTimers({ now: 1_000_000 });
    render(
      <StartCountdown
        endsAt={1_000_000 + 4_200}
        serverOffset={0}
        themeName="Folclore brasileiro"
        themeEmoji="🌿"
      />,
    );
    expect(screen.getByText("A partida começa em 5")).toHaveProperty("ariaLive", "assertive");
  });

  it("largada: no fim aparece o Vai!", () => {
    vi.useFakeTimers({ now: 1_000_000 });
    render(<StartCountdown endsAt={999_000} serverOffset={0} themeName="Fauna" themeEmoji="🐆" />);
    expect(screen.getAllByText("Vai!").length).toBeGreaterThan(0);
  });

  it("entre rodadas: só aparece nos últimos 3 segundos do intervalo", () => {
    vi.useFakeTimers({ now: 1_000_000 });
    const { rerender } = render(
      <BetweenRoundsCountdown endsAt={1_000_000 + 7_000} serverOffset={0} from={3} nextRound={2} />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(
      <BetweenRoundsCountdown endsAt={1_000_000 + 2_500} serverOffset={0} from={3} nextRound={2} />,
    );
    expect(screen.getByRole("dialog", { name: "Rodada 2 vai começar" })).toBeTruthy();
    expect(screen.getByText("Rodada 2 em 3")).toBeTruthy();
  });
});
