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
        {isDark ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-3 h-3 text-text-primary"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.752 15.002A9.718 9.718 0 0112 15c-4.25 0-7.86-2.91-9.252-7.002z"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-3 h-3 text-text-primary"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 21v-2.25m-6.364-.386l1.591-1.591M3 12H5.25m-.386-6.364l1.591 1.591M12 12a9 9 0 11-1.414-1.414L12 12zm0 0V12"
            />
          </svg>
        )}
      </span>
    </button>
  )}
export default ThemeToggle;