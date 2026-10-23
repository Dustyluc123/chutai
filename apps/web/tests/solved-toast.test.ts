import { describe, expect, it } from "vitest";
import { solvedToastText } from "@/lib/solved-toast";

describe("aviso de quem acertou", () => {
  it("um acerto só", () => {
    expect(solvedToastText([{ nickname: "Bia", rank: 1 }])).toBe("Bia acertou primeiro!");
    expect(solvedToastText([{ nickname: "Caio", rank: 3 }])).toBe("Caio acertou!");
  });

  it("acertos juntos viram um aviso só", () => {
    expect(
      solvedToastText([
        { nickname: "Bia", rank: 1 },
        { nickname: "Caio", rank: 2 },
      ]),
    ).toBe("Bia acertou primeiro, e Caio também!");
    expect(
      solvedToastText([
        { nickname: "Bia", rank: 1 },
        { nickname: "Caio", rank: 2 },
        { nickname: "Duda", rank: 3 },
      ]),
    ).toBe("Bia acertou primeiro, e mais 2 também!");
    expect(
      solvedToastText([
        { nickname: "Caio", rank: 2 },
        { nickname: "Duda", rank: 3 },
      ]),
    ).toBe("Caio e Duda acertaram!");
    expect(
      solvedToastText([
        { nickname: "Caio", rank: 2 },
        { nickname: "Duda", rank: 3 },
        { nickname: "Enzo", rank: 4 },
      ]),
    ).toBe("Caio e mais 2 acertaram!");
  });
});
