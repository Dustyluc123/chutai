import { describe, expect, it } from "vitest";
import { PIX_KEY, PIX_PAYLOAD, parseEmv, pixCrc } from "@/lib/support";

describe("Pix do Apoie", () => {
  const fields = parseEmv(PIX_PAYLOAD);
  const account = parseEmv(fields.get("26") ?? "");

  it("aponta para a chave certa", () => {
    expect(account.get("00")).toBe("br.gov.bcb.pix");
    expect(account.get("01")).toBe(PIX_KEY);
  });

  it("é estático: sem URL de cobrança (dinâmico), sem valor fixo e sem 'uso único'", () => {
    expect(account.has("25")).toBe(false); // URL de Pix dinâmico
    expect(fields.has("54")).toBe(false); // valor
    expect(fields.get("01") ?? "11").toBe("11"); // 11 = estático (12 seria uso único)
    expect(fields.get("53")).toBe("986"); // real
  });

  it("o dígito verificador (CRC) confere", () => {
    const body = PIX_PAYLOAD.slice(0, -4);
    expect(body.endsWith("6304")).toBe(true);
    expect(pixCrc(body)).toBe(PIX_PAYLOAD.slice(-4));
  });
});
