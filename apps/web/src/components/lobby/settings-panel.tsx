"use client";

import { useEffect, useState } from "react";
import {
  ROUND_SECONDS_OPTIONS,
  ROUNDS_OPTIONS,
  type RoomSettings,
  type ThemeSummary,
} from "@chutai/shared";
import { OptionGroup } from "@/components/ui/option-group";
import { Switch } from "@/components/ui/switch";
import { THEME_COLORS } from "@/lib/colors";
import { cn } from "@/lib/cn";

interface SettingsPanelProps {
  settings: RoomSettings;
  editable: boolean;
  onChange: (changes: Partial<RoomSettings>) => void;
}

/** Regras da partida. Só o anfitrião mexe; os outros veem as mesmas opções travadas. */
export function SettingsPanel({ settings, editable, onChange }: SettingsPanelProps) {
  const [themes, setThemes] = useState<ThemeSummary[]>([]);

  useEffect(() => {
    fetch("/api/themes")
      .then((response) => response.json() as Promise<ThemeSummary[]>)
      .then(setThemes)
      .catch(() => setThemes([]));
  }, []);

  return (
    <section
      aria-label="Regras da partida"
      className="flex flex-col gap-5 rounded-3xl border-2 border-tinta bg-white p-5 sm:p-6"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">Regras</h2>
        {!editable ? <span className="text-sm text-tinta-soft">O anfitrião escolhe</span> : null}
      </div>

      <fieldset disabled={!editable} className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-semibold">Tema</legend>
        <div className="flex flex-col gap-2">
          {themes.map((theme) => {
            const selected = theme.slug === settings.themeSlug;
            const color = THEME_COLORS[theme.color];
            return (
              <label
                key={theme.slug}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-2.5 transition-colors",
                  "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-chiclete",
                  selected ? "border-tinta bg-papel" : "border-linha hover:border-tinta/40",
                  !editable && "cursor-default",
                  !editable && !selected && "hidden",
                )}
              >
                <input
                  type="radio"
                  name="tema"
                  className="sr-only"
                  checked={selected}
                  onChange={() => onChange({ themeSlug: theme.slug })}
                />
                <span
                  aria-hidden
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-tinta text-2xl",
                    color.bg,
                  )}
                >
                  {theme.emoji}
                </span>
                <span className="flex flex-col">
                  <span className="font-semibold">{theme.name}</span>
                  <span className="text-sm text-tinta-soft">
                    {theme.characterCount} personagens
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <OptionGroup
        label="Rodadas"
        value={settings.rounds}
        disabled={!editable}
        options={ROUNDS_OPTIONS.map((value) => ({ value, label: String(value) }))}
        onChange={(rounds) => onChange({ rounds })}
      />

      <OptionGroup
        label="Tempo por rodada"
        value={settings.roundSeconds}
        disabled={!editable}
        options={ROUND_SECONDS_OPTIONS.map((value) => ({
          value,
          label: value < 60 ? `${value}s` : `${value / 60} min`.replace(".5", ",5"),
        }))}
        onChange={(roundSeconds) => onChange({ roundSeconds })}
      />

      <Switch
        label="Dicas"
        description="Liberadas depois de 3 chutes. Cada uma custa 150 pontos."
        checked={settings.hintsEnabled}
        disabled={!editable}
        onChange={(hintsEnabled) => onChange({ hintsEnabled })}
      />
    </section>
  );
}
