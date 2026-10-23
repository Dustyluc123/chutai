import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DailyHearts, DailyStatsPanel } from "@/components/daily/daily-hearts";

describe("corações do diário", () => {
  it("anuncia para o leitor de tela quantos corações sobram", () => {
    const { rerender } = render(<DailyHearts left={5} total={8} />);
    expect(screen.getByRole("status").textContent).toBe("Restam 5 de 8 corações");
    rerender(<DailyHearts left={1} total={8} />);
    expect(screen.getByRole("status").textContent).toBe("Resta 1 de 8 corações");
  });

  it("estatísticas mostram vitórias e derrotas (antigas sem derrotas contam 0)", () => {
    render(<DailyStatsPanel stats={{ played: 4, wins: 4, streak: 4, maxStreak: 4 }} />);
    const derrotas = screen.getByText("Derrotas").parentElement!;
    expect(derrotas.textContent).toContain("0");
    expect(screen.getByText("Vitórias").parentElement!.textContent).toContain("4");
  });
});
