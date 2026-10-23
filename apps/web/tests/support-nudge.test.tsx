import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SupportNudge } from "@/components/support/support-nudge";

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

const shown = () => screen.queryByRole("complementary", { name: "Apoie o projeto" });

describe("convite para apoiar", () => {
  it("aparece com o link para /apoie", () => {
    render(<SupportNudge where="sala:ABC234" />);
    expect(shown()).not.toBeNull();
    expect(screen.getByRole("link", { name: "Apoie o projeto" }).getAttribute("href")).toBe(
      "/apoie",
    );
  });

  it("uma vez por dia: noutro lugar no mesmo dia, não aparece; recarregar o mesmo, sim", () => {
    render(<SupportNudge where="sala:ABC234" />);
    cleanup();
    render(<SupportNudge where="diario:fauna:3" />);
    expect(shown()).toBeNull();
    cleanup();
    render(<SupportNudge where="sala:ABC234" />);
    expect(shown()).not.toBeNull();
  });

  it("fechou: nunca mais", () => {
    render(<SupportNudge where="sala:ABC234" />);
    fireEvent.click(screen.getByRole("button", { name: "Fechar convite" }));
    expect(shown()).toBeNull();
    cleanup();
    localStorage.setItem(
      "chutai:apoie",
      JSON.stringify({ ...JSON.parse(localStorage.getItem("chutai:apoie")!), day: "2000-01-01" }),
    );
    render(<SupportNudge where="sala:OUTRA1" />);
    expect(shown()).toBeNull();
  });
});
