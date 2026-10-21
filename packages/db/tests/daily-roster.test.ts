import { describe, expect, it } from "vitest";
import { DAILY_ROSTER, OFFICIAL_THEMES } from "../src";

describe("roster do desafio diário", () => {
  it("todo personagem dos temas oficiais está no roster (senão: pnpm daily:roster)", () => {
    for (const theme of OFFICIAL_THEMES) {
      const entries = DAILY_ROSTER[theme.slug];
      expect(entries, `tema ${theme.slug} fora do roster: rode pnpm daily:roster`).toBeDefined();
      const missing = theme.characters.filter((c) => !entries![c.id]).map((c) => c.id);
      expect(missing, `faltam no roster de ${theme.slug}: rode pnpm daily:roster`).toEqual([]);
    }
  });

  it("só guarda id e data: nada que diga qual personagem cai em qual dia", () => {
    for (const entries of Object.values(DAILY_ROSTER)) {
      for (const [id, since] of Object.entries(entries)) {
        expect(id).toMatch(/^[a-z0-9-]+$/);
        expect(since).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
});
