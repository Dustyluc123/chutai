import { avatarBackground } from "@/lib/colors";
import { cn } from "@/lib/cn";

const sizes = {
  sm: "size-8 text-base",
  md: "size-11 text-xl",
  lg: "size-16 text-3xl",
  xl: "size-24 text-5xl",
};

interface AvatarProps {
  emoji: string;
  size?: keyof typeof sizes;
  dimmed?: boolean;
  className?: string;
  label?: string;
}

export function Avatar({ emoji, size = "md", dimmed, className, label }: AvatarProps) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border-2 border-tinta leading-none",
        avatarBackground(emoji),
        sizes[size],
        dimmed && "opacity-40 grayscale",
        className,
      )}
    >
      {emoji}
    </span>
  );
}
