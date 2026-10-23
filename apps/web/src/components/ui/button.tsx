import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger" | "onDark";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  // Botão principal: gema com sombra "carimbo", afunda ao clicar.
  primary:
    "bg-gema text-tinta border-2 border-tinta shadow-carimbo hover:-translate-y-px hover:shadow-[5px_5px_0_var(--color-tinta)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
  accent:
    "bg-chiclete text-tinta border-2 border-tinta shadow-carimbo hover:-translate-y-px active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
  secondary: "bg-white text-tinta border-2 border-tinta hover:bg-anil-soft",
  ghost: "text-tinta hover:bg-tinta/5",
  danger: "text-pitanga hover:bg-pitanga/10",
  onDark: "text-white border-2 border-white/40 hover:border-white hover:bg-white/10",
};

const sizes: Record<Size, string> = {
  // Pequeno no desenho, mas com área de toque de 44 px (hit-44).
  sm: "h-9 px-3 text-sm rounded-lg gap-1.5 hit-44",
  md: "h-11 px-5 text-base rounded-xl gap-2",
  lg: "h-14 px-7 text-lg rounded-2xl gap-2.5",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, disabled, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center font-semibold whitespace-nowrap transition-[transform,box-shadow,background-color] duration-100 select-none",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  );
});
