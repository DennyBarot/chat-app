import React, { useEffect, useState, useCallback } from "react";

const ThemeToggle = () => {
  // Get initial theme, preferring user's saved choice, then system preference, otherwise light
  const getInitialIsDark = useCallback(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) return savedTheme === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }, []);

  const [isDark, setIsDark] = useState(getInitialIsDark);

  // Update class & storage whenever theme changes
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  // Listen to system theme changes (optional, for rare manual OS theme switches)
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = (e) => {
      // Only react to system changes if user hasn't set their own theme
      if (!localStorage.getItem("theme")) {
        setIsDark(e.matches);
      }
    };
    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, []);

  // Toggle handler
  const toggleTheme = useCallback(() => setIsDark((prev) => !prev), []);

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className="ml-3 px-2 py-1 rounded transition-colors bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600"
    >
      {isDark ? "Dark Mode 🌙" : "Light Mode ☀️"}
    </button>
  );
};

export default ThemeToggle;
