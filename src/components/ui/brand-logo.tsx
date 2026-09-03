import React from "react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  showTagline?: boolean;
  collapsed?: boolean;
}

export function BrandLogo({
  className,
  size = "md",
  showText = true,
  showTagline = true,
  collapsed = false,
}: BrandLogoProps) {
  const sizeMap = {
    sm: {
      img: "h-8 w-8",
      title: "text-sm",
      tagline: "text-[8px]",
    },
    md: {
      img: "h-10 w-10",
      title: "text-base font-bold",
      tagline: "text-[9px]",
    },
    lg: {
      img: "h-14 w-14",
      title: "text-xl font-bold",
      tagline: "text-[10px]",
    },
    xl: {
      img: "h-20 w-20",
      title: "text-2xl font-bold",
      tagline: "text-xs",
    },
  };

  const currentSize = sizeMap[size];

  if (collapsed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl bg-white p-1 shadow-xs border border-slate-200/80 dark:border-slate-800",
          currentSize.img,
          className
        )}
        title="AARIGO CAPITAL — Growing Today, Securing Tomorrow"
      >
        <img
          src="/logo.png"
          alt="Aarigo Capital"
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      {/* Brand Icon / Symbol */}
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-xs border border-slate-200/80 dark:border-slate-800 overflow-hidden",
          currentSize.img
        )}
      >
        <img
          src="/logo.png"
          alt="Aarigo Capital Logo"
          className="h-full w-full object-contain"
        />
      </div>

      {/* Typography Lockup */}
      {showText && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={cn("tracking-tight text-foreground font-black uppercase text-[#6DA728] dark:text-[#83C532]", currentSize.title)}>
              AARIGO
            </span>
            <span className={cn("tracking-widest font-bold text-foreground text-slate-800 dark:text-slate-200", currentSize.title)}>
              CAPITAL
            </span>
          </div>

          {showTagline && (
            <span className={cn("font-medium tracking-wider text-muted-foreground uppercase mt-0.5 whitespace-nowrap", currentSize.tagline)}>
              Growing Today, Securing Tomorrow
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Full Banner version for login screens, sanction letters, and splash components */
export function BrandBanner({ className, alt = "Aarigo Capital" }: { className?: string; alt?: string }) {
  return (
    <div className={cn("rounded-2xl overflow-hidden bg-white shadow-xs border border-slate-200/80 dark:border-slate-800 p-2", className)}>
      <img
        src="/logo.png"
        alt={alt}
        className="w-full h-auto object-contain max-h-48 mx-auto"
      />
    </div>
  );
}
