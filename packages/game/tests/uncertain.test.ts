import { describe, expect, it } from "vitest";
import type { Character, ThemeAttribute } from "@chutai/shared";
import { compareCharacters } from "../src/compare";
import { explainFeedback } from "../src/explain";
import { formatCharacterValue } from "../src/format";
import { buildHint } from "../src/hints";

const attributes: ThemeAttribute[] = [
  { key: "estado", label: "Estado de nascimento", type: "text" },
  {
    key: "nascimento",
    label: "Nascimento",
    type: "range",
    tolerance: 10,
    toleranceIsPercent: false,
  },
];
const zumbi: Character = {
  id: "zumbi",
  name: "Zumbi",
  approx: ["nascimento"],
  values: { estado: "Incerto", nascimento: 1655 },
};
const tereza: Character = {
  id: "tereza",
  name: "Tereza",
  values: { estado: "Exterior", nascimento: "Incerto" },
};
const gama: Character = {
  id: "gama",
  name: "Luís Gama",
  values: { estado: "Bahia", nascimento: 1831 },
};

describe("valores aproximados e incertos", () => {
  it("Incerto, no chute ou na resposta, nunca conta como erro", () => {
    const [estado] = compareCharacters(zumbi, gama, attributes);
    expect(estado).toMatchObject({ status: "unknown", display: "Incerto" });
    const [, nascimento] = compareCharacters(gama, tereza, attributes);
    expect(nascimento!.status).toBe("unknown");
    expect(compareCharacters(gama, zumbi, attributes)[0]!.status).toBe("unknown");
  });

  it("ano aproximado aparece com c. e continua usando a tolerância", () => {
    const answer: Character = { id: "x", name: "X", values: { estado: "Bahia", nascimento: 1660 } };
    const [, nascimento] = compareCharacters(zumbi, answer, attributes);
    expect(nascimento).toMatchObject({ display: "c. 1655", status: "partial", direction: "up" });
    expect(formatCharacterValue(attributes[1]!, zumbi)).toBe("c. 1655");
    expect(explainFeedback("Nascimento", nascimento!)).toBe(
      "Nascimento: c. 1655. Chegou perto! O do personagem secreto é depois de c. 1655.",
    );
  });

  it("explicação do cinza", () => {
    expect(
      explainFeedback("Estado", { key: "estado", display: "Incerto", status: "unknown" }),
    ).toBe("Estado: Incerto. Ninguém sabe ao certo, então não conta como erro.");
  });

  it("a dica de atributo pula o que é Incerto e mostra o aproximado com c.", () => {
    const hint = buildHint("attribute", zumbi, attributes, []);
    expect(hint).toMatchObject({ attributeKey: "nascimento", text: "Nascimento: c. 1655" });
  });
});
