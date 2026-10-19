import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/cn";

const items = [
  { className: "bg-folha border-folha", label: "Igual à resposta" },
  { className: "bg-gema border-gema", label: "Chegou perto ou tem algo em comum" },
  { className: "bg-pitanga border-pitanga", label: "Diferente" },
];

/** Explica as cores das peças. */
export function Legend({ className }: { className?: string }) {
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
        A resposta é maior
      </li>
    </ul>
  );
}
