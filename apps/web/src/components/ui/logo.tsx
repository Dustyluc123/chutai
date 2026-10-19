import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Logotipo: "Chutaí" em Archivo bem larga. O acento agudo do "í" vira
 * um traço gordo cor de gema, a única cor dentro da marca.
 */
export function Logo({
  className,
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  return (
    <Link
      href="/"
      aria-label="Chutaí, página inicial"
      className={cn(
        "font-display inline-flex items-baseline text-2xl",
        tone === "light" ? "text-white" : "text-tinta",
        className,
      )}
    >
      <span aria-hidden className="inline-flex items-baseline">
        Chuta
        <span className="relative">
          ı
          <span className="absolute top-[0.1em] left-[0.05em] h-[0.26em] w-[0.2em] skew-x-[-30deg] rounded-[0.04em] bg-gema" />
        </span>
      </span>
    </Link>
  );
}
