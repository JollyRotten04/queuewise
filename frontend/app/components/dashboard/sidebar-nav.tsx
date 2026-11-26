"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
    { label: "Overview", href: "/dashboard", icon: "▦" },
    { label: "Queues", href: "/dashboard/queues", icon: "☰" },
    { label: "Analytics", href: "/dashboard/analytics", icon: "🗠" },
];

export default function SidebarNav() {
    const pathname = usePathname();

    return (
        // Phones: three equal tabs in a row that always fit (no sideways scrolling). Desktop: vertical sidebar.
        <nav aria-label="Dashboard" className="grid grid-cols-3 gap-1 lg:flex lg:flex-col">
            {links.map((link) => {
                const active = pathname === link.href;
                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center justify-center lg:justify-start gap-1.5 lg:gap-3 px-2 lg:px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${active ? "bg-violet-500 text-white shadow" : "text-zinc-700 dark:text-zinc-300 hover:bg-violet-50 dark:hover:bg-violet-500/10"}`}
                    >
                        <span aria-hidden="true" className="text-base">{link.icon}</span>
                        {link.label}
                    </Link>
                );
            })}
        </nav>
    );
}
