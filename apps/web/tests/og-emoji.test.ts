/** @vitest-environment node */
import { afterEach, describe, expect, it, vi } from "vitest";
import { emojiDataUri, ogText, twemojiCode } from "@/lib/og/emoji";

afterEach(() => vi.unstubAllGlobals());

describe("emojis nas imagens geradas", () => {
  it("acha o arquivo do Twemoji de cada emoji", () => {
    expect(twemojiCode("⚽")).toBe("26bd");
    expect(twemojiCode("🌶️")).toBe("1f336"); // sem o seletor FE0F
    expect(twemojiCode("🏟️")).toBe("1f3df");
    expect(twemojiCode("🦜")).toBe("1f99c");
  });

  it("se a CDN falhar, devolve null (a imagem sai sem o emoji) em vez de erro", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("sem rede")));
    await expect(emojiDataUri("🐸")).resolves.toBeNull();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("x", { status: 503 })));
    await expect(emojiDataUri("🐸")).resolves.toBeNull();
  });

  it("com a CDN no ar, vira um data URI de SVG", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<svg/>", { status: 200 })));
    await expect(emojiDataUri("🦋")).resolves.toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it("tira do texto o que a fonte não desenha", () => {
    expect(ogText("Ação 😀", "Alguém")).toBe("Ação");
    expect(ogText("さくら", "Alguém")).toBe("Alguém");
    expect(ogText("José Ñandú", "x")).toBe("José Ñandú");
  });
});
