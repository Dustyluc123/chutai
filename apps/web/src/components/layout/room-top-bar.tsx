"use client";

import { LogOut, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/logo";
import { SoundButton } from "@/components/ui/sound-button";
import { HowToPlayButton, type HelpTab } from "@/components/help/how-to-play";

interface RoomTopBarProps {
  code: string;
  themeName?: string;
  themeEmoji?: string;
  connected: boolean;
  onLeave?: () => void;
  /** Aba que o "Como jogar" abre primeiro (a do modo da sala). */
  helpTab?: HelpTab;
  children?: ReactNode;
}

/** Faixa anil no topo da sala: marca, código, tema e botão de sair. */
export function RoomTopBar({
  code,
  themeName,
  themeEmoji,
  connected,
  onLeave,
  helpTab,
  children,
}: RoomTopBarProps) {
  return (
    <header className="bg-anil text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Logo tone="light" className="text-xl" />
        <span className="tabular rounded-lg bg-white/15 px-2.5 py-1 text-sm font-bold tracking-[0.15em]">
          {code}
        </span>
        {themeName ? (
          <span className="hidden items-center gap-1.5 text-sm font-semibold text-white/85 sm:inline-flex">
            <span aria-hidden>{themeEmoji}</span> {themeName}
          </span>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          {!connected ? (
            <span
              role="status"
              className="inline-flex items-center gap-1.5 rounded-lg bg-pitanga px-2.5 py-1 text-sm font-semibold"
            >
              <WifiOff aria-hidden className="size-4" /> Reconectando…
            </span>
          ) : null}
          <SoundButton tone="light" />
          <HowToPlayButton tone="light" initialTab={helpTab} />
          {onLeave ? (
            <button
              type="button"
              onClick={onLeave}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-white/85 hover:bg-white/10 hover:text-white"
            >
              <LogOut aria-hidden className="size-4" /> Sair
            </button>
          ) : null}
        </div>
      </div>
      {children}
    </header>
  );
}
