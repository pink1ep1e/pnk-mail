"use client";

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { cn } from "@/lib/utils";

type HiIconProps = {
  icon: IconSvgElement;
  size?: number;
  className?: string;
  strokeWidth?: number;
  color?: string;
};

/** Hugeicons wrapper for Pro Solid (and any IconSvgElement). */
export function HiIcon({
  icon,
  size = 20,
  className,
  color = "currentColor",
}: HiIconProps) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      color={color}
      className={cn("shrink-0", className)}
    />
  );
}

export type { IconSvgElement };
