/** Privacidade dos relatórios de erro: nada que identifique alguém sai para o Sentry. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { scrubSentryEvent } from "@chutai/shared";
import { logger, setErrorReporter } from "../src/lib/logger";
import { initSentry } from "../src/lib/sentry";

describe("filtro de privacidade do Sentry", () => {
  it("tira usuário, IP, cabeçalhos, cookies, corpo e query do pedido", () => {
    const event = scrubSentryEvent({
      message: "falhou",
      user: { ip_address: "203.0.113.9", username: "Ana" },
      extra: { nickname: "Ana", characterId: "saci" },
      request: {
        url: "https://chutai-bay.vercel.app/api/diario/folclore?x=1",
        headers: { "x-forwarded-for": "203.0.113.9", cookie: "a=b" },
        cookies: { a: "b" },
        data: { characterId: "saci" },
        query_string: "x=1",
      },
    });
    expect(event.user).toBeUndefined();
    expect(event.extra).toBeUndefined();
    expect(event.request).toEqual({ url: "https://chutai-bay.vercel.app/api/diario/folclore" });
    expect(JSON.stringify(event)).not.toMatch(/203\.0\.113|Ana|saci|cookie/);
  });

  it("tira rastros de cliques, console e pedidos; navegação fica só com o caminho", () => {
    const event = scrubSentryEvent({
      breadcrumbs: [
        { category: "ui.click", message: "button[aria-label='Chutar Saci']" },
        { category: "console", message: "Ana entrou" },
        { category: "fetch", data: { url: "/api/diario/x", body: "saci" } },
        { category: "navigation", data: { from: "/sala/ABC234?t=1", to: "/diario" } },
      ],
    });
    expect(event.breadcrumbs).toEqual([
      { category: "navigation", data: { from: "/sala/ABC234", to: "/diario" } },
    ]);
  });
});

describe("logger e Sentry", () => {
  afterEach(() => setErrorReporter(undefined));

  it("sem SENTRY_DSN, o Sentry não liga", async () => {
    expect(await initSentry({})).toBe(false);
  });

  it("só os erros vão para o relator (avisos e informações não)", () => {
    const report = vi.fn();
    setErrorReporter(report);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    const error = new Error("boom");
    logger.info("oi");
    logger.warn("cuidado");
    logger.error("quebrou", error);
    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith("quebrou", error);
    vi.restoreAllMocks();
  });
});
