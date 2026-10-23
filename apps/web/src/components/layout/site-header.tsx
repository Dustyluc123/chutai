import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { SoundButton } from "@/components/ui/sound-button";
import { cn } from "@/lib/cn";

/** Cabeçalho. `tone="light"` para usar sobre o fundo anil. */
export function SiteHeader({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const link = cn(
    "hit-44 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
    tone === "light"
      ? "text-white/85 hover:text-white hover:bg-white/10"
      : "text-tinta-soft hover:text-tinta hover:bg-tinta/5",
  );
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
      <Logo tone={tone} />
      <nav aria-label="Principal" className="flex items-center gap-1">
        <Link href="/diario" className={link}>
          Diário
        </Link>
        <Link href="/temas" className={link}>
          Temas
        </Link>
        <Link href="/#como-funciona" className={cn(link, "hidden sm:inline-flex")}>
          Como jogar
        </Link>
        <Link href="/criar-tema" className={cn(link, "hidden sm:inline-flex")}>
          Criar tema
        </Link>
        <SoundButton tone={tone} />
      </nav>
    </header>
  );
}
