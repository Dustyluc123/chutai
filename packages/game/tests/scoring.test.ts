import { describe, expect, it } from "vitest";
import { computeRoundPoints } from "../src/scoring";

describe("computeRoundPoints", () => {
  it("bate com o exemplo do plano: 60 de 90 s, 4º chute, sem dica, primeiro a acertar", () => {
    expect(
      computeRoundPoints({
        remainingMs: 60_000,
        totalMs: 90_000,
        guesses: 4,
        hintsUsed: 0,
        solveRank: 1,
      }),
    ).toBe(813);
  });

  it("acertar de primeira no início vale o máximo", () => {
    expect(
      computeRoundPoints({
        remainingMs: 90_000,
        totalMs: 90_000,
        guesses: 1,
        hintsUsed: 0,
        solveRank: 1,
      }),
    ).toBe(1100);
  });

  it("acertar no último segundo ainda garante a base", () => {
    expect(
      computeRoundPoints({
        remainingMs: 0,
        totalMs: 90_000,
        guesses: 1,
        hintsUsed: 0,
        solveRank: 3,
      }),
    ).toBe(500);
  });

  it("nunca fica abaixo do mínimo, mesmo com muitos chutes e dicas", () => {
    expect(
      computeRoundPoints({
        remainingMs: 0,
        totalMs: 90_000,
        guesses: 30,
        hintsUsed: 2,
        solveRank: 4,
      }),
    ).toBe(100);
  });

  it("segundo lugar ganha bônus menor", () => {
    const first = computeRoundPoints({
      remainingMs: 0,
      totalMs: 1,
      guesses: 1,
      hintsUsed: 0,
      solveRank: 1,
    });
    const second = computeRoundPoints({
      remainingMs: 0,
      totalMs: 1,
      guesses: 1,
      hintsUsed: 0,
      solveRank: 2,
    });
    expect(first - second).toBe(50);
  });

  it("cada dica custa 150 pontos", () => {
    const without = computeRoundPoints({
      remainingMs: 0,
      totalMs: 1,
      guesses: 1,
      hintsUsed: 0,
      solveRank: 5,
    });
    const withOne = computeRoundPoints({
      remainingMs: 0,
      totalMs: 1,
      guesses: 1,
      hintsUsed: 1,
      solveRank: 5,
    });
    expect(without - withOne).toBe(150);
  });
});
