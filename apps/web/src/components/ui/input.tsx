import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-12 w-full rounded-xl border-2 border-linha bg-white px-4 text-base text-tinta placeholder:text-tinta-soft/60",
          "transition-colors focus:border-tinta focus:outline-none aria-invalid:border-pitanga",
          className,
        )}
        {...props}
      />
    );
  },
);

interface FieldProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  children: (props: {
    id: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
  }) => ReactNode;
}

/** Rótulo + campo + mensagem de erro, já ligados para leitores de tela. */
export function Field({ label, error, hint, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-msg`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error || hint ? messageId : undefined,
      })}
      {error ? (
        <p id={messageId} role="alert" className="text-sm font-medium text-pitanga">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-sm text-tinta-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
