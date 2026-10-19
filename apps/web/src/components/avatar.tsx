import { cn } from "cn";
import { initials } from "@/lib/initials";

/** Initials on an ember gradient. Decorative: the name is always shown next to it. */
export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-ember to-brand text-xs font-semibold text-[#1c1206]",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
