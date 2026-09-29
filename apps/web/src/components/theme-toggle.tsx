"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Tooltip } from "@/components/ui";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read active theme from documentElement (which was initialized by inline script)
    const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    setTheme(current);
    setMounted(true);

    // Also listen to system preference changes if no manual choice is saved
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("execlink-theme")) {
        const nextTheme = e.matches ? "dark" : "light";
        document.documentElement.dataset.theme = nextTheme;
        setTheme(nextTheme);
      }
    };

    media.addEventListener("change", handleMediaChange);
    return () => media.removeEventListener("change", handleMediaChange);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("execlink-theme", next);
    } catch {
      // LocalStorage access might fail in restricted environments
    }
  }

  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <Tooltip label={label} side="bottom" align="end">
      <button
        className="icon-button theme-toggle-btn"
        aria-label={label}
        onClick={toggleTheme}
        type="button"
      >
        {mounted && theme === "dark" ? (
          <Sun size={16} aria-hidden="true" />
        ) : (
          <Moon size={16} aria-hidden="true" />
        )}
      </button>
    </Tooltip>
  );
}
