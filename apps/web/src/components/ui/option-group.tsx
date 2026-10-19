"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

interface Option<T extends string | number> {
  value: T;
  label: string;
}

interface OptionGroupProps<T extends string | number> {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
}

/** Grupo de opções lado a lado (rádio acessível com cara de botão). */
export function OptionGroup<T extends string | number>({
  label,
  value,
  options,
  onChange,
  disabled,
}: OptionGroupProps<T>) {
  const name = useId();
  return (
    <fieldset disabled={disabled} className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={String(option.value)}
              className={cn(
                "relative flex h-10 min-w-12 cursor-pointer items-center justify-center rounded-lg border-2 px-3 text-sm font-semibold transition-colors",
                "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-chiclete",
                checked
                  ? "border-tinta bg-tinta text-white"
                  : "border-linha bg-white text-tinta hover:border-tinta/50",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="radio"
                name={name}
                className="sr-only"
                checked={checked}
                onChange={() => onChange(option.value)}
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
