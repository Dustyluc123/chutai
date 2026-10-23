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

describe("diário com corações: compartilhar e estatísticas", () => {
  const miss = row(["wrong", "partial"]);
  const hit = row(["correct", "correct"], true);

  it("acerto: no Nº chute, com os corações que sobraram em vermelho", () => {
    const text = dailyShareText({
      number: 3,
      themeName: "Fauna",
      guesses: [miss, miss, miss, hit],
      hintsUsed: 0,
      url: "u",
      lives: true,
    });
    expect(text.split("\n")[1]).toBe("Acertei no 4º chute ❤️❤️❤️❤️❤️🖤🖤🖤");
    expect(text).not.toContain("Segredo");
  });

  it("derrota: não consegui, com os 8 corações pretos", () => {
    const text = dailyShareText({
      number: 3,
      themeName: "Fauna",
      guesses: Array(8).fill(miss),
      hintsUsed: 1,
      url: "u",
      lives: true,
    });
    expect(text.split("\n")[1]).toBe("Não consegui 🖤🖤🖤🖤🖤🖤🖤🖤 · usei 1 dica");
    expect(text.split("\n")).toHaveLength(2 + 8 + 1);
  });

  it("derrota quebra a sequência e conta uma vez; estatísticas antigas continuam valendo", async () => {
    const { statsAfterLoss } = await import("@/lib/daily/storage");
    let stats = statsAfterWin(statsAfterWin(EMPTY_STATS, 5), 6);
    expect(stats.streak).toBe(2);
    stats = statsAfterLoss(stats, 7);
    expect(stats).toMatchObject({ played: 3, wins: 2, losses: 1, streak: 0, maxStreak: 2 });
    expect(statsAfterLoss(stats, 7)).toBe(stats);
    expect(statsAfterWin(stats, 7)).toBe(stats); // perdeu hoje: não vira vitória depois
    expect(statsAfterWin(stats, 8)).toMatchObject({ streak: 1, wins: 3 });
    // Formato antigo (sem derrotas) segue funcionando.
    const old = { played: 4, wins: 4, streak: 4, maxStreak: 4, lastWin: 9 };
    expect(statsAfterLoss(old, 10)).toMatchObject({ played: 5, wins: 4, losses: 1, streak: 0 });
  });

  it("regras do progresso: desafio começado sem corações termina sem corações", async () => {
    const { progressRules, progressOutcome } = await import("@/lib/daily/storage");
    const legacy = { day: 3, guesses: Array(9).fill(miss), hints: [] };
    expect(progressRules(legacy, "2026-10-24")).toBe("livre");
    expect(progressOutcome(legacy, "2026-10-24")).toBe("playing");
    const fresh = { day: 3, guesses: [], hints: [] };
    expect(progressRules(fresh, "2026-10-24")).toBe("coracoes");
    expect(progressRules(fresh, "2026-10-23")).toBe("livre");
    const lost = { day: 3, guesses: Array(8).fill(miss), hints: [], rules: "coracoes" as const };
    expect(progressOutcome(lost, "2026-10-24")).toBe("lost");
  });
});
