import type { FeedbackStatus, ThemeColor } from "@chutai/shared";

/** Cor de destaque de cada tema (fundo forte + texto que contrasta). */
export const THEME_COLORS: Record<ThemeColor, { bg: string; text: string; soft: string }> = {
  anil: { bg: "bg-anil", text: "text-white", soft: "bg-anil-soft" },
  gema: { bg: "bg-gema", text: "text-tinta", soft: "bg-gema-soft" },
  chiclete: { bg: "bg-chiclete", text: "text-tinta", soft: "bg-chiclete-soft" },
  folha: { bg: "bg-folha", text: "text-white", soft: "bg-folha-soft" },
  laranja: { bg: "bg-laranja", text: "text-tinta", soft: "bg-gema-soft" },
};

/** Cores das peças do tabuleiro: verde acertou, amarelo chegou perto, vermelho errou. */
export const STATUS_STYLES: Record<FeedbackStatus, string> = {
  correct: "bg-folha text-white border-folha",
  partial: "bg-gema text-tinta border-gema",
  wrong: "bg-pitanga text-white border-pitanga",
};

export const STATUS_LABEL: Record<FeedbackStatus, string> = {
  correct: "igual",
  partial: "perto",
  wrong: "diferente",
};

/** Fundo do círculo do avatar, sempre o mesmo para o mesmo emoji. */
const AVATAR_BACKGROUNDS = [
  "bg-gema",
  "bg-chiclete-soft",
  "bg-folha-soft",
  "bg-anil-soft",
  "bg-gema-soft",
  "bg-chiclete",
];

export function avatarBackground(avatar: string): string {
  let hash = 0;
  for (const char of avatar) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return AVATAR_BACKGROUNDS[hash % AVATAR_BACKGROUNDS.length]!;
}
