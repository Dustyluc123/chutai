"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

interface SwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Switch({ label, description, checked, onChange, disabled }: SwitchProps) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={id} className={cn("flex flex-col", disabled && "opacity-60")}>
        <span className="text-sm font-semibold">{label}</span>
        {description ? <span className="text-sm text-tinta-soft">{description}</span> : null}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-tinta transition-colors disabled:cursor-not-allowed disabled:opacity-60",
          checked ? "bg-folha" : "bg-linha",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute top-0.5 left-0.5 size-5 rounded-full border-2 border-tinta bg-white transition-transform",
            checked && "translate-x-5",
          )}
        />
      </button>
    </div>
  );
}
