import React from "react";

interface ExecLinkBrandProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ExecLinkBrand({ size = "md", className = "" }: ExecLinkBrandProps) {
  const iconSizes = {
    sm: "w-5 h-5",
    md: "w-7 h-7", // ~28px
    lg: "w-8 h-8", // 32px
  };
  
  const textSizes = {
    sm: "text-lg",
    md: "text-2xl", // ~24px
    lg: "text-3xl",
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`flex items-center justify-center text-[var(--primary)] ${iconSizes[size]}`}>
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="w-full h-full">
          <circle cx="4" cy="10" r="2" fill="currentColor" />
          <circle cx="16" cy="5" r="2" fill="currentColor" />
          <circle cx="16" cy="15" r="2" fill="currentColor" />
          <path
            d="M6 10h3.2M10 10l4.2-4M10 10l4.2 4"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className={`font-bold tracking-tight text-[var(--text)] ${textSizes[size]}`}>
        ExecLink
      </div>
    </div>
  );
}
