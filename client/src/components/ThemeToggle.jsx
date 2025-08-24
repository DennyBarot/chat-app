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
      className="relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 focus:outline-none bg-foreground"
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