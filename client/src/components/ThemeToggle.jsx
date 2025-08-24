import React, { useEffect, useState } from "react";

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(
    () =>
      localStorage.getItem("theme") === "dark" ||
      (localStorage.getItem("theme") == null &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
  );

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark((prev) => !prev)}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className="ml-3 px-2 py-1 rounded transition-colors bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600"
    >
      <span
        className={`${isDark ? "translate-x-6" : "translate-x-1"}
          inline-block w-4 h-4 transform rounded-full transition-transform duration-300 flex items-center justify-center`}
      >
        {isDark ? "Dark Mode 🌙" : "Light Mode ☀️"}
      <span
        className={`${isDark ? "translate-x-6" : "translate-x-1"}
          inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300`}
      />
      </span>
    </button>
  )}
export default ThemeToggle;