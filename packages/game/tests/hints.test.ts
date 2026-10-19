import { describe, expect, it } from "vitest";
import type { GuessResult } from "@chutai/shared";
import { buildHint, canRequestHint } from "../src/hints";
import { compareCharacters } from "../src/compare";
import { attributes, capivara, onca } from "./fixtures";

function guess(feedbackFrom = capivara): GuessResult {
  return {
    characterId: feedbackFrom.id,
    characterName: feedbackFrom.name,
    feedback: compareCharacters(feedbackFrom, onca, attributes),
    correct: false,
    guessNumber: 1,
  };
}

describe("canRequestHint", () => {
  const base = {
    hintsEnabled: true,
    guesses: [guess(), guess(), guess()],
    hintsUsed: [],
    solved: false,
  };

  it("libera depois de 3 chutes", () => {
    expect(canRequestHint("attribute", base)).toEqual({ allowed: true });
    expect(canRequestHint("attribute", { ...base, guesses: [guess()] })).toMatchObject({
      allowed: false,
    });
  });

  it("bloqueia quando as dicas estão desligadas ou o jogador já acertou", () => {
    expect(canRequestHint("attribute", { ...base, hintsEnabled: false }).allowed).toBe(false);
    expect(canRequestHint("attribute", { ...base, solved: true }).allowed).toBe(false);
  });

  it("não deixa repetir o mesmo tipo de dica", () => {
    const used = [{ type: "attribute" as const, text: "x" }];
    expect(canRequestHint("attribute", { ...base, hintsUsed: used }).allowed).toBe(false);
    expect(canRequestHint("firstLetter", { ...base, hintsUsed: used }).allowed).toBe(true);
  });
});

describe("buildHint", () => {
  it("primeira letra do nome", () => {
    expect(buildHint("firstLetter", onca, attributes, []).text).toContain("O");
  });

  it("revela um atributo que o jogador ainda não acertou", () => {
    const hint = buildHint("attribute", onca, attributes, [guess()]);
    expect(hint.attributeKey).toBe("region");
    expect(hint.text).toBe("Região: Norte");
  });
});
