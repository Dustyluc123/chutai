import { describe, expect, it } from "vitest";
import { explainFeedback } from "../src/explain";

describe("explicação das peças do tabuleiro", () => {
  it("ano: diz antes ou depois, em vez de maior ou menor", () => {
    expect(
      explainFeedback("Nascimento", {
        key: "nascimento",
        display: "1993",
        status: "wrong",
        direction: "down",
      }),
    ).toBe("Nascimento: 1993. O do personagem secreto é antes de 1993.");
    expect(
      explainFeedback("Início da carreira", {
        key: "inicio",
        display: "1990",
        status: "partial",
        direction: "up",
      }),
    ).toBe("Início da carreira: 1990. Chegou perto! O do personagem secreto é depois de 1990.");
  });

  it("número com unidade: maior ou menor", () => {
    expect(
      explainFeedback("Peso adulto", {
        key: "peso",
        display: "50 kg",
        status: "wrong",
        direction: "up",
      }),
    ).toBe("Peso adulto: 50 kg. O do personagem secreto é maior que 50 kg.");
    expect(
      explainFeedback("Copas do Mundo", {
        key: "copas",
        display: "2",
        status: "wrong",
        direction: "down",
      }),
    ).toBe("Copas do Mundo: 2. O do personagem secreto é menor que 2.");
  });

  it("igual, em comum e diferente", () => {
    expect(explainFeedback("Clube atual", { key: "c", display: "Santos", status: "correct" })).toBe(
      "Clube atual: Santos. Igual ao do personagem secreto.",
    );
    expect(
      explainFeedback("Biomas", { key: "b", display: "Cerrado, Pantanal", status: "partial" }),
    ).toBe("Biomas: Cerrado, Pantanal. Tem algo em comum com o personagem secreto, mas não tudo.");
    expect(explainFeedback("Posição", { key: "p", display: "Meia", status: "wrong" })).toBe(
      "Posição: Meia. Diferente do personagem secreto.",
    );
  });
});
