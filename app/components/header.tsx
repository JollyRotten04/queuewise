"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import ThemeToggle from "./theme-toggle";
import { primaryButton } from "../lib/styles";

const navLinks = [
    { label: "Features", href: "/#features" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Pricing", href: "/#pricing" },
    { label: "About", href: "/#about" },
    { label: "FAQ", href: "/#faq" },
    { label: "Contact", href: "/#contact" },
];

export default function Header(){
    const [menuOpen, setMenuOpen] = useState(false);

    return(
        <header className="sticky top-0 z-50 bg-white/95 dark:bg-black/95 backdrop-blur border-b border-gray-200 dark:border-gray-600 flex flex-col w-full h-fit">
            <div className="px-4 py-2 flex items-center justify-between flex-1 w-full">

                <Link href="/" className="flex items-center" onClick={() => setMenuOpen(false)}>

                    <Image src="/logo-light-mode.svg" alt="QueueWise logo" width={48} height={48} draggable={false} className="select-none" />

                    <p className="text-xl font-bold text-black dark:text-zinc-50">QueueWise</p>
                </Link>

                <nav className="hidden lg:flex flex-1 justify-center items-center gap-8" aria-label="Main">
                    {navLinks.map((link) => (
                        <Link key={link.href} href={link.href} className="text-xs font-semibold text-black dark:text-zinc-50 select-none hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <div className="hidden lg:flex items-center gap-4">
                    <Link href="/login" className="text-xs font-semibold text-black dark:text-zinc-50 select-none hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Login</Link>

                    <Link href="/signup" className={`${primaryButton} px-2.5 py-1.5`}>Get Started</Link>

                    <ThemeToggle />
                </div>

                <div className="flex lg:hidden items-center gap-2">
                    <ThemeToggle />

                    <button
                        type="button"
                        onClick={() => setMenuOpen((open) => !open)}
                        aria-expanded={menuOpen}
                        aria-controls="mobile-menu"
                        aria-label={menuOpen ? "Close menu" : "Open menu"}
                        className="p-2 rounded-lg text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                            {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
                        </svg>
                    </button>
                </div>
            </div>

            {menuOpen && (
                <nav id="mobile-menu" className="lg:hidden flex flex-col gap-1 px-4 pb-4 border-t border-gray-200 dark:border-gray-700" aria-label="Mobile">
                    {navLinks.map((link) => (
                        <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="py-2.5 text-sm font-semibold text-black dark:text-zinc-50">
                            {link.label}
                        </Link>
                    ))}

                    <div className="flex gap-3 pt-3">
                        <Link href="/login" onClick={() => setMenuOpen(false)} className="flex-1 text-center rounded-full border border-zinc-500 px-4 py-2 text-xs font-semibold text-violet-600 dark:text-violet-400">Login</Link>

                        <Link href="/signup" onClick={() => setMenuOpen(false)} className="flex-1 text-center rounded-full bg-violet-500 px-4 py-2 text-xs font-semibold text-white">Get Started</Link>
                    </div>
                </nav>
            )}
        </header>
    );
}
