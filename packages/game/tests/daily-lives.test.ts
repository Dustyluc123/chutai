import { describe, expect, it } from "vitest";
import { DAILY } from "../src/config";
import { dailyHasLives, dailyLivesLeft, dailyOutcome } from "../src/daily";

const miss = { correct: false };
const hit = { correct: true };
const misses = (n: number) => Array.from({ length: n }, () => miss);

describe("diário: corações", () => {
  it("são 8 e começam no dia seguinte ao deploy", () => {
    expect(DAILY.lives).toBe(8);
    expect(dailyHasLives("2026-10-23")).toBe(false);
    expect(dailyHasLives(DAILY.livesFromDate)).toBe(true);
    expect(dailyHasLives("2027-01-01")).toBe(true);
  });

  it("cada chute errado gasta um coração; acertar não gasta", () => {
    expect(dailyLivesLeft([])).toBe(8);
    expect(dailyLivesLeft(misses(3))).toBe(5);
    expect(dailyLivesLeft([...misses(3), hit])).toBe(5);
    expect(dailyLivesLeft(misses(12))).toBe(0);
  });

  it("acertou é vitória; o 8º erro é derrota; antes disso, continua", () => {
    expect(dailyOutcome([], true)).toBe("playing");
    expect(dailyOutcome(misses(7), true)).toBe("playing");
    expect(dailyOutcome([...misses(7), hit], true)).toBe("won");
    expect(dailyOutcome(misses(8), true)).toBe("lost");
  });

  it("sem corações (desafio começado antes da mudança), nunca perde", () => {
    expect(dailyOutcome(misses(20), false)).toBe("playing");
    expect(dailyOutcome([...misses(20), hit], false)).toBe("won");
  });
});
