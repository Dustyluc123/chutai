import Image from "next/image";
import { cn } from "@/lib/cn";

/** Tamanho em pixels de cada variação (o quadrado da imagem). */
const SIZES = {
  sm: { px: 32, emoji: "text-xl" },
  md: { px: 40, emoji: "text-2xl" },
  lg: { px: 64, emoji: "text-4xl" },
  xl: { px: 112, emoji: "text-6xl sm:text-7xl" },
} as const;

interface CharacterPictureProps {
  name: string;
  image?: string;
  emoji?: string;
  size?: keyof typeof SIZES;
  /**
   * true quando o nome do personagem já aparece ao lado: a imagem vira decoração
   * (alt vazio) para o leitor de tela não repetir o nome.
   */
  decorative?: boolean;
  className?: string;
}

/**
 * Imagem do personagem; sem imagem, mostra o emoji (e sem emoji, um ponto de interrogação).
 * Caminhos locais ("/temas/...") passam pela otimização do Next; URLs externas, no futuro,
 * vêm de armazenamento próprio e são mostradas como estão.
 */
export function CharacterPicture({
  name,
  image,
  emoji,
  size = "md",
  decorative,
  className,
}: CharacterPictureProps) {
  const { px, emoji: emojiSize } = SIZES[size];

  if (!image) {
    return (
      <span
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : name}
        aria-hidden={decorative ? true : undefined}
        style={{ width: px, height: px }}
        className={cn(
          "inline-flex shrink-0 items-center justify-center leading-none",
          emojiSize,
          className,
        )}
      >
        {emoji ?? "❔"}
      </span>
    );
  }

  return (
    <Image
      src={image}
      alt={decorative ? "" : name}
      width={px}
      height={px}
      unoptimized={/^https?:\/\//.test(image)}
      className={cn(
        "shrink-0 rounded-xl border-2 border-tinta bg-papel object-cover",
        size === "sm" && "rounded-lg",
        className,
      )}
      style={{ width: px, height: px }}
    />
  );
}
