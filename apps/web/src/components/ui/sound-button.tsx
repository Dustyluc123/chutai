"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { setSoundSettings, useSoundSettings } from "@/lib/sound/settings";
import { cn } from "@/lib/cn";

/** Botão de som (barra da sala e cabeçalho): efeitos e música separados, salvos no navegador. */
export function SoundButton({ tone = "dark" }: { tone?: "light" | "dark" }) {
  const settings = useSoundSettings();
  // Posição do painel (fixa na tela, a partir do botão), ou null se fechado.
  const [panel, setPanel] = useState<{ top: number; right: number } | null>(null);
  const open = panel !== null;
  const setOpen = (value: boolean) => setPanel(value ? place() : null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const muted = !settings.effects && !settings.music;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setPanel(null);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setPanel(null);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function place() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return { top: 64, right: 16 };
    const width = 256 + 16; // largura do painel + margem da tela
    const right = Math.min(Math.max(16, window.innerWidth - rect.right), window.innerWidth - width);
    return { top: rect.bottom + 8, right: Math.max(16, right) };
  }

  const Icon = muted ? VolumeX : Volume2;
  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Som"
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold",
          tone === "light"
            ? "text-white/85 hover:bg-white/10 hover:text-white"
            : "text-tinta-soft hover:bg-tinta/5 hover:text-tinta",
        )}
      >
        <Icon aria-hidden className="size-4" />
        <span className="hidden sm:inline">Som</span>
      </button>
      {panel ? (
        <div
          id={panelId}
          role="group"
          aria-label="Som"
          style={{ top: panel.top, right: panel.right }}
          className="fixed z-40 flex w-64 flex-col gap-4 rounded-2xl border-2 border-tinta bg-white p-4 text-tinta shadow-carimbo"
        >
          <Switch
            label="Efeitos"
            description="Chutes, contagem e pódio."
            checked={settings.effects}
            onChange={(effects) => setSoundSettings({ effects })}
          />
          <Switch
            label="Música"
            description="Fundo calmo, gerado no navegador."
            checked={settings.music}
            onChange={(music) => setSoundSettings({ music })}
          />
        </div>
      ) : null}
    </div>
  );
}
