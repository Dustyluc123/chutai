import { describe, expect, it } from "vitest";
import type { GuessResult } from "@chutai/shared";
import { dailyShareText } from "@/lib/daily/share";
import { EMPTY_STATS, statsAfterWin } from "@/lib/daily/storage";

const row = (statuses: ("correct" | "partial" | "wrong")[], correct = false): GuessResult => ({
  characterId: "x",
  characterName: "Segredo",
  feedback: statuses.map((status, i) => ({ key: `a${i}`, display: "?", status })),
  correct,
  guessNumber: 1,
});

describe("diário: texto de compartilhar", () => {
  it("quadradinhos por chute, sem revelar o personagem", () => {
    const text = dailyShareText({
      number: 12,
      themeName: "Folclore brasileiro",
      guesses: [
        row(["wrong", "partial", "wrong", "wrong", "partial"]),
        row(["partial", "correct", "wrong", "correct", "partial"]),
        row(["correct", "correct", "correct", "correct", "correct"], true),
      ],
      hintsUsed: 0,
      url: "https://chutai-bay.vercel.app/diario",
    });
    expect(text).toBe(
      [
        "Chutaí #12 · Folclore brasileiro",
        "Acertei em 3 chutes",
        "🟥🟨🟥🟥🟨",
        "🟨🟩🟥🟩🟨",
        "🟩🟩🟩🟩🟩",
        "https://chutai-bay.vercel.app/diario",
      ].join("\n"),
    );
    expect(text).not.toContain("Segredo");
  });

  it("mostra se usou dica", () => {
    const text = dailyShareText({
      number: 1,
      themeName: "Fauna",
      guesses: [row(["correct"], true)],
      hintsUsed: 1,
      url: "u",
    });
    expect(text.split("\n")[1]).toBe("Acertei em 1 chute (usei 1 dica)");
  });
});

describe("diário: sequência de dias seguidos", () => {
  it("acertar dias seguidos soma; pular um dia recomeça; o mesmo dia não conta duas vezes", () => {
    let stats = statsAfterWin(EMPTY_STATS, 5);
    stats = statsAfterWin(stats, 6);
    expect(stats.streak).toBe(2);
    expect(statsAfterWin(stats, 6)).toBe(stats);
    stats = statsAfterWin(stats, 9);
    expect(stats).toMatchObject({ streak: 1, maxStreak: 2, wins: 3 });
  });
});
