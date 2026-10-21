import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/cn";

const items = [
  { className: "bg-folha border-folha", label: "Igual ao secreto" },
  { className: "bg-gema border-gema", label: "Perto ou tem algo em comum" },
  { className: "bg-pitanga border-pitanga", label: "Diferente" },
];

/** Explica as cores das peças. */
export function Legend({
  className,
  tapTip = true,
  unknown = false,
}: {
  className?: string;
  tapTip?: boolean;
  /** Mostra o cinza ("ninguém sabe ao certo") quando ele aparece no tabuleiro. */
  unknown?: boolean;
}) {
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-2 text-sm text-tinta-soft", className)}>
      {items.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-2">
          <span aria-hidden className={cn("size-4 rounded-md border-2", item.className)} />
          {item.label}
        </li>
      ))}
      <li className="inline-flex items-center gap-2">
        <span
          aria-hidden
          className="inline-flex size-4 items-center justify-center rounded-md border-2 border-tinta"
        >
          <ArrowUp className="size-3" strokeWidth={3} />
        </span>
        O secreto é maior ou mais recente
      </li>
      {unknown ? (
        <li className="inline-flex items-center gap-2">
          <span aria-hidden className="size-4 rounded-md border-2 border-linha bg-linha" />
          Ninguém sabe ao certo (não conta como erro)
        </li>
      ) : null}
      {tapTip ? <li className="font-semibold text-tinta">Toque numa peça para entender.</li> : null}
    </ul>
  );
}
