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
      className="ml-3 px-4 py-2 rounded transition-colors bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600"
    >
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium">
          {isDark ? "Dark Mode 🌙" : "Light Mode ☀️"}
        </span>
        <span
          className={`${isDark ? "translate-x-6" : "translate-x-1"}
            inline-block w-6 h-6 transform bg-white rounded-full transition-transform duration-300`}
        />
      </div>
    </button>
  );
};

export default ThemeToggle;
