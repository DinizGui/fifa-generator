import Image from "next/image";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  src: string | null | undefined;
  alt: string;
  size?: number;
  className?: string;
};

/** Face Sofifa via `cdn.sofifa.net` (configurado em `next.config.mjs`). */
export function PlayerAvatar({ src, alt, size = 48, className }: Props) {
  const dim = size;
  if (!src) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted-foreground",
          className,
        )}
        style={{ width: dim, height: dim }}
        aria-hidden
      >
        <User className="size-[55%]" />
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={dim}
      height={dim}
      className={cn("shrink-0 rounded-full border border-white/10 object-cover object-top", className)}
      sizes={`${dim}px`}
      unoptimized
    />
  );
}
