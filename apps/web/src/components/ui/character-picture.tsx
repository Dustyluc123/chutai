import Image from "next/image";
import { cn } from "@/lib/cn";

/** Tamanho em pixels de cada variação (o quadrado da imagem). */
const SIZES = {
  sm: { px: 32, emoji: "text-xl" },
  md: { px: 40, emoji: "text-2xl" },
  lg: { px: 64, emoji: "text-4xl" },
  xl: { px: 112, emoji: "text-6xl sm:text-7xl" },
  /** Tabuleiro: 32 px no celular, 40 px a partir do `sm`. */
  board: { px: 40, emoji: "text-xl sm:text-2xl" },
} as const;

/** Tamanhos que mudam com a tela: medidas pelas classes, não pelo `style`. */
const RESPONSIVE: Partial<Record<keyof typeof SIZES, string>> = {
  board: "size-8 sm:size-10",
};

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
 * As imagens são servidas como estão (`images.unoptimized` no next.config): os .webp dos temas
 * já são pequenos, e a otimização da Vercel tem limite baixo no plano gratuito.
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
  const responsive = RESPONSIVE[size];
  const box = responsive ? undefined : { width: px, height: px };

  if (!image) {
    return (
      <span
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : name}
        aria-hidden={decorative ? true : undefined}
        style={box}
        className={cn(
          "inline-flex shrink-0 items-center justify-center leading-none",
          emojiSize,
          responsive,
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
      className={cn(
        "shrink-0 rounded-xl border-2 border-tinta bg-papel object-cover",
        (size === "sm" || size === "board") && "rounded-lg",
        responsive,
        className,
      )}
      style={box}
    />
  );
}
