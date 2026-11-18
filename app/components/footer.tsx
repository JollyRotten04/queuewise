import Image from "next/image";
import Link from "next/link";

const footerLinks = [
    {
        heading: "Product",
        links: [
            { label: "Features", href: "/#features" },
            { label: "How It Works", href: "/#how-it-works" },
            { label: "Pricing", href: "/#pricing" },
            { label: "Privacy & Security", href: "/#privacy" },
        ],
    },
    {
        heading: "Visitors",
        links: [
            { label: "Join a Queue", href: "/join" },
            { label: "Check My Ticket", href: "/join#check-ticket" },
            { label: "FAQ", href: "/#faq" },
        ],
    },
    {
        heading: "Staff",
        links: [
            { label: "Login", href: "/login" },
            { label: "Create Account", href: "/signup" },
            { label: "Dashboard", href: "/dashboard" },
            { label: "Lobby Display", href: "/display" },
            { label: "Contact Us", href: "/#contact" },
        ],
    },
];

export default function Footer() {
    return (
        <footer className="w-full bg-white dark:bg-black border-t border-gray-200 dark:border-gray-700">
            <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">

                <div className="col-span-2 md:col-span-1 flex flex-col gap-2">
                    <div className="flex items-center">
                        <Image src="/logo-light-mode.svg" alt="" width={40} height={40} draggable={false} className="select-none" />

                        <p className="text-lg font-bold text-black dark:text-zinc-50">Queue<span className="text-violet-600 dark:text-violet-400">Wise</span></p>
                    </div>

                    <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs">
                        Smart Queue. Better Experience. Join, wait, and get served without the crowded waiting room.
                    </p>
                </div>

                {footerLinks.map((group) => (
                    <div key={group.heading} className="flex flex-col gap-2">
                        <p className="text-xs font-semibold text-black dark:text-zinc-50 uppercase tracking-wide">{group.heading}</p>

                        {group.links.map((link) => (
                            <Link key={link.label} href={link.href} className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors w-fit">
                                {link.label}
                            </Link>
                        ))}
                    </div>
                ))}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-4">
                <p className="text-xs text-center text-zinc-500">© 2026 QueueWise. All rights reserved.</p>
            </div>
        </footer>
    );
}
