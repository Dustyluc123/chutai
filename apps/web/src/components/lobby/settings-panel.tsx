"use client";

import { useEffect, useState } from "react";
import { Image as ImageIcon, LayoutGrid, Shuffle } from "lucide-react";
import {
  ROUND_SECONDS_OPTIONS,
  ROUNDS_OPTIONS,
  type GameMode,
  type RoomSettings,
  type ThemeSummary,
} from "@chutai/shared";
import { OptionGroup } from "@/components/ui/option-group";
import { Switch } from "@/components/ui/switch";
import { THEME_COLORS } from "@/lib/colors";
import { cn } from "@/lib/cn";

interface SettingsPanelProps {
  settings: RoomSettings;
  /** Tema atual da sala (vem do servidor): diz se o modo Imagem está disponível. */
  theme: ThemeSummary;
  editable: boolean;
  onChange: (changes: Partial<RoomSettings>) => void;
}

/** Regras da partida. Só o anfitrião mexe; os outros veem as mesmas opções travadas. */
const MODES: {
  value: GameMode;
  label: string;
  description: string;
  Icon: typeof LayoutGrid;
}[] = [
  {
    value: "classic",
    label: "Clássico",
    description: "Cada chute mostra os atributos coloridos.",
    Icon: LayoutGrid,
  },
  {
    value: "image",
    label: "Imagem",
    description: "A imagem começa borrada e fica mais nítida a cada erro ou dica.",
    Icon: ImageIcon,
  },
  {
    value: "mixed",
    label: "Misto",
    description: "Alterna as rodadas: uma Clássica, uma de Imagem.",
    Icon: Shuffle,
  },
];

export function SettingsPanel({ settings, theme, editable, onChange }: SettingsPanelProps) {
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
                    {theme.imageMode === "full"
                      ? " · tem modo Imagem"
                      : theme.imageMode === "partial"
                        ? " · tem modo Imagem parcial"
                        : ""}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset disabled={!editable} className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-semibold">Modo de jogo</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {MODES.map(({ value, label, description, Icon }) => {
            const selected = settings.mode === value;
            const unavailable = value !== "classic" && theme.imageMode === "none";
            const reasonId = `modo-${value}-motivo`;
            return (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-2xl border-2 p-3 transition-colors",
                  "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-chiclete",
                  selected ? "border-tinta bg-papel" : "border-linha hover:border-tinta/40",
                  !editable && "cursor-default",
                  !editable && !selected && "hidden",
                  unavailable && "cursor-not-allowed opacity-60 hover:border-linha",
                )}
              >
                <input
                  type="radio"
                  name="modo"
                  className="sr-only"
                  checked={selected}
                  disabled={unavailable}
                  aria-describedby={reasonId}
                  onChange={() => onChange({ mode: value })}
                />
                <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
                <span className="flex flex-col gap-0.5">
                  <span className="font-semibold">{label}</span>
                  <span id={reasonId} className="text-sm text-tinta-soft">
                    {unavailable
                      ? "Indisponível neste tema: menos de 75% dos personagens têm imagem."
                      : description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        {settings.mode !== "classic" && theme.imageMode === "partial" ? (
          <p
            role="status"
            className="mt-1 rounded-2xl border-2 border-gema bg-gema-soft px-3 py-2.5 text-sm font-semibold"
          >
            {settings.mode === "image"
              ? `Modo Imagem parcial: ${theme.imageCharacterCount} de ${theme.characterCount} personagens têm imagem. Os outros ficam de fora desta partida.`
              : `Imagem parcial: nas rodadas de Imagem, só entram os ${theme.imageCharacterCount} de ${theme.characterCount} personagens que têm imagem.`}
          </p>
        ) : null}
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
