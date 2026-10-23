import { describe, expect, it } from "vitest";
import { visibleEntries } from "@/lib/long-list";

const players = Array.from({ length: 30 }, (_, i) => `J${i + 1}`);

describe("lista longa de jogadores", () => {
  it("mostra os primeiros e você, mesmo lá embaixo", () => {
    const { shown, hidden } = visibleEntries(players, {
      limit: 5,
      isMe: (p) => p === "J20",
      expanded: false,
    });
    expect(shown.map((s) => s.item)).toEqual(["J1", "J2", "J3", "J4", "J5", "J20"]);
    expect(shown.at(-1)?.index).toBe(19);
    expect(hidden).toBe(24);
  });

  it("você entre os primeiros: não repete", () => {
    const { shown, hidden } = visibleEntries(players, {
      limit: 5,
      isMe: (p) => p === "J2",
      expanded: false,
    });
    expect(shown).toHaveLength(5);
    expect(hidden).toBe(25);
  });

  it("aberta ou curta, mostra todo mundo", () => {
    expect(visibleEntries(players, { limit: 5, isMe: () => false, expanded: true }).hidden).toBe(0);
    expect(
      visibleEntries(players.slice(0, 6), { limit: 5, isMe: () => false, expanded: false }).shown,
    ).toHaveLength(6);
  });
});
