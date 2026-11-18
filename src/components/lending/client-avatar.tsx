"use client";

import { avatarHue, initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ClientAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-9 shrink-0 select-none items-center justify-center rounded-full text-[13px] font-semibold",
        "ring-2 ring-card shadow-sm",
        avatarHue(name),
        className
      )}
    >
      {initials(name)}
    </span>
  );
}
