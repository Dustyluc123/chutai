import { describe, expect, it } from "vitest";
import { drawCharacter, randomCode } from "../src/draw";
import { searchCharacters } from "../src/search";
import { anta, capivara, lobo, onca } from "./fixtures";

const all = [onca, capivara, lobo, anta];

describe("drawCharacter", () => {
  it("nunca repete enquanto houver personagens disponíveis", () => {
    const used = new Set<string>();
    for (let i = 0; i < all.length; i++) {
      const picked = drawCharacter(all, used);
      expect(used.has(picked.id)).toBe(false);
      used.add(picked.id);
    }
    expect(used.size).toBe(all.length);
  });

  it("volta a sortear entre todos quando acabam", () => {
    const used = new Set(all.map((c) => c.id));
    expect(all).toContain(drawCharacter(all, used));
  });

  it("aceita gerador aleatório previsível", () => {
    expect(drawCharacter(all, new Set(), () => 0).id).toBe("onca");
    expect(drawCharacter(all, new Set(), () => 0.9999).id).toBe("anta");
  });
});

describe("randomCode", () => {
  it("gera código no tamanho e alfabeto pedidos", () => {
    const code = randomCode("AB", 6);
    expect(code).toMatch(/^[AB]{6}$/);
  });
});

describe("searchCharacters", () => {
  const options = all.map((c) => ({ id: c.id, name: c.name, aliases: c.aliases ?? [] }));

  it("ignora acentos e maiúsculas", () => {
    expect(searchCharacters(options, "ONCA").map((o) => o.id)).toEqual(["onca"]);
  });

  it("acha pelo apelido", () => {
    expect(searchCharacters(options, "jag").map((o) => o.id)).toEqual(["onca"]);
  });

  it("acha pelo começo de qualquer palavra e esconde quem já foi chutado", () => {
    expect(searchCharacters(options, "guará").map((o) => o.id)).toEqual(["lobo"]);
    expect(searchCharacters(options, "a", new Set(["anta"])).map((o) => o.id)).not.toContain(
      "anta",
    );
  });

  it("texto vazio não lista nada", () => {
    expect(searchCharacters(options, "  ")).toEqual([]);
  });
});
