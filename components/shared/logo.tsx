import React from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

interface Props {
  className?: string;
  href?: string;
  variant?: "text" | "bg" | "mark" | "business" | "id";
  width?: number;
  height?: number;
  priority?: boolean;
}

export const Logo: React.FC<Props> = ({
  className,
  href = "/",
  variant = "text",
  width,
  height,
  priority = false,
}) => {
  const src =
    variant === "business"
      ? "/logo-bussines.svg"
      : variant === "id"
        ? "/logo-id.svg"
        : variant === "mark"
          ? "/logo-big-mail.svg"
          : variant === "bg"
            ? "/logo-blue-bg.svg"
            : "/logo-blue-text.svg";

  const defaultSize =
    variant === "business"
      ? { width: width ?? 220, height: height ?? 47 }
      : variant === "id"
        ? { width: width ?? 160, height: height ?? 48 }
        : variant === "text"
          ? { width: width ?? 160, height: height ?? 85 }
          : { width: width ?? 48, height: height ?? 48 };

  const alt =
    variant === "business"
      ? "pnk почта бизнес"
      : variant === "id"
        ? "pnk ID"
        : "pnk почта";

  const image = (
    <Image
      src={src}
      alt={alt}
      width={defaultSize.width}
      height={defaultSize.height}
      priority={priority}
      className={cn(
        "select-none object-contain",
        variant === "text" && "h-auto w-[120px] md:w-[160px]",
        variant === "business" && "h-auto w-[160px] md:w-[210px]",
        variant === "id" && "h-auto w-[96px] md:w-[110px]",
        variant === "mark" && "h-11 w-11 md:h-12 md:w-12 rounded-[14px]",
        variant === "bg" && "h-auto w-auto",
        className,
      )}
    />
  );

  if (!href) return image;

  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center"
      aria-label={alt}
    >
      {image}
    </Link>
  );
};
