import { ImageOff } from "lucide-react";
import { cn } from "@/lib/cn";

interface MysteryImageProps {
  /** URL local da imagem degradada (ou null enquanto não chega). */
  url: string | null;
  level: number;
  maxLevel: number;
  status: "loading" | "ready" | "error";
  className?: string;
}

/**
 * Imagem secreta do modo Imagem. O navegador só tem a versão degradada do nível
 * que este jogador alcançou: borrar aqui com CSS não seria seguro.
 */
export function MysteryImage({ url, level, maxLevel, status, className }: MysteryImageProps) {
  const steps = maxLevel + 1;
  const label = `Nitidez ${level + 1} de ${steps}`;

  return (
    <figure className={cn("flex w-full max-w-[300px] flex-col gap-2", className)}>
      <div className="relative aspect-square w-full overflow-hidden rounded-3xl border-2 border-tinta bg-anil-soft shadow-carimbo">
        {url ? (
          // Imagem gerada pelo servidor (blob:): next/image não se aplica.
          <img
            key={url}
            src={url}
            alt={`Imagem misteriosa do personagem, borrada. ${label}.`}
            width={300}
            height={300}
            className="size-full animate-pop object-cover [image-rendering:auto]"
          />
        ) : status === "error" ? (
          <div className="flex size-full flex-col items-center justify-center gap-2 p-6 text-center text-sm font-semibold text-tinta-soft">
            <ImageOff aria-hidden className="size-8" />
            Não deu para carregar a imagem desta rodada. Dá para chutar e usar as dicas mesmo assim.
          </div>
        ) : (
          <div
            role="status"
            className="flex size-full animate-pulse items-center justify-center text-sm font-semibold text-tinta-soft"
          >
            Preparando a imagem…
          </div>
        )}
      </div>
      <figcaption className="flex items-center justify-between gap-3 text-xs font-semibold text-tinta-soft">
        <span>Cada chute errado ou dica deixa mais nítida</span>
        <span role="img" aria-label={label} className="flex gap-0.5">
          {Array.from({ length: steps }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-2 w-3 rounded-[3px] border border-tinta/40",
                i <= level ? "border-anil bg-anil" : "bg-white",
              )}
            />
          ))}
        </span>
      </figcaption>
    </figure>
  );
}
