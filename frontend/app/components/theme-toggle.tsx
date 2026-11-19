"use client";

import Image from "next/image";

export default function ThemeToggle() {
    function toggleTheme() {
        const isDark = document.documentElement.classList.toggle("dark");
        try {
            localStorage.setItem("theme", isDark ? "dark" : "light");
        } catch {
            // Storage can be unavailable (private mode); the toggle still works for this page view.
        }
    }

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="select-none cursor-pointer p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
            <Image src="/night-mode.svg" alt="" width={16} height={16} draggable={false} className="select-none dark:invert" />
        </button>
    );
}
