import { describe, expect, it } from "vitest";
import { compareAttribute, compareCharacters, countCorrect } from "../src/compare";
import { anta, attributes, capivara, lobo, onca } from "./fixtures";

const [region, biomes, year, weight] = attributes as [
  (typeof attributes)[0],
  (typeof attributes)[0],
  (typeof attributes)[0],
  (typeof attributes)[0],
];

describe("compareAttribute", () => {
  it("texto: ignora maiúsculas e acentos", () => {
    expect(compareAttribute(region, "NORTE", "norte").status).toBe("correct");
    expect(compareAttribute(region, "Sudeste", "Norte").status).toBe("wrong");
  });

  it("lista: verde quando é igual, amarelo quando tem algo em comum, vermelho quando não tem", () => {
    expect(compareAttribute(biomes, ["Cerrado", "Pantanal"], ["Pantanal", "Cerrado"]).status).toBe(
      "correct",
    );
    expect(compareAttribute(biomes, ["Cerrado"], ["Pantanal", "Cerrado"]).status).toBe("partial");
    expect(compareAttribute(biomes, ["Caatinga"], ["Pantanal", "Cerrado"]).status).toBe("wrong");
  });

  it("número: mostra seta para cima quando a resposta é maior", () => {
    expect(compareAttribute(year, 1900, 1900)).toMatchObject({ status: "correct" });
    expect(compareAttribute(year, 1800, 1900)).toMatchObject({ status: "wrong", direction: "up" });
    expect(compareAttribute(year, 2000, 1900)).toMatchObject({
      status: "wrong",
      direction: "down",
    });
  });

  it("faixa: amarelo dentro da tolerância, vermelho fora", () => {
    // resposta 100 kg, tolerância 25% → 75 a 125 é amarelo
    expect(compareAttribute(weight, 80, 100)).toMatchObject({ status: "partial", direction: "up" });
    expect(compareAttribute(weight, 60, 100)).toMatchObject({ status: "wrong", direction: "up" });
    expect(compareAttribute(weight, 100, 100)).toMatchObject({ status: "correct" });
  });

  it("valor ausente conta como errado e aparece como traço", () => {
    expect(compareAttribute(region, undefined, "Norte")).toMatchObject({
      status: "wrong",
      display: "—",
    });
  });

  it("formata unidade e números para exibição", () => {
    expect(compareAttribute(weight, 0.5, 100).display).toBe("0,5 kg");
    expect(compareAttribute(year, 1758, 1758).display).toBe("1758");
  });
});

describe("compareCharacters", () => {
  it("acertar o personagem deixa tudo verde", () => {
    const feedback = compareCharacters(onca, onca, attributes);
    expect(countCorrect(feedback)).toBe(attributes.length);
  });

  it("mistura de resultados num palpite real", () => {
    const feedback = compareCharacters(capivara, onca, attributes);
    expect(feedback.map((item) => item.status)).toEqual(["wrong", "partial", "wrong", "wrong"]);
    expect(feedback[2]?.direction).toBe("down"); // 1758 < 1766
  });

  it("personagens diferentes podem ter atributos iguais", () => {
    const feedback = compareCharacters(anta, onca, attributes);
    expect(feedback.map((item) => item.status)).toEqual([
      "correct",
      "correct",
      "correct",
      "partial",
    ]);
  });

  it("nada em comum fica tudo vermelho", () => {
    const feedback = compareCharacters(lobo, capivara, attributes);
    expect(countCorrect(feedback)).toBe(0);
  });
});
