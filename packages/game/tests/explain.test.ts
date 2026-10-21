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

describe("explicação com a palavra do tema", () => {
  it("estado (masculino) e cidade (feminino)", () => {
    const estado = { singular: "estado", plural: "estados", gender: "m" as const };
    expect(
      explainFeedback(
        "Área",
        { key: "a", display: "1,2 mil km²", status: "wrong", direction: "up" },
        estado,
      ),
    ).toBe("Área: 1,2 mil km². O do estado secreto é maior que 1,2 mil km².");
    const cidade = { singular: "cidade", plural: "cidades", gender: "f" as const };
    expect(explainFeedback("Região", { key: "r", display: "Sul", status: "correct" }, cidade)).toBe(
      "Região: Sul. Igual ao da cidade secreta.",
    );
    expect(
      explainFeedback("Biomas", { key: "b", display: "Cerrado", status: "partial" }, cidade),
    ).toBe("Biomas: Cerrado. Tem algo em comum com a cidade secreta, mas não tudo.");
  });
});

describe("anos antigos", () => {
  it("anos da Colônia também viram antes/depois", () => {
    expect(
      explainFeedback("Nascimento", {
        key: "n",
        display: "1746",
        status: "wrong",
        direction: "down",
      }),
    ).toBe("Nascimento: 1746. O do personagem secreto é antes de 1746.");
  });
});
