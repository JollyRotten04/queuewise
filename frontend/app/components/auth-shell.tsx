import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "./theme-toggle";
import Badge from "./badge";

export default function AuthShell({ title, highlight, subtitle, children, footer }: { title: string; highlight: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
    return (
        <div className="flex flex-1 w-full min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">

            <div className="relative hidden lg:flex flex-col justify-between w-1/2 overflow-hidden bg-violet-50 dark:bg-zinc-900 p-10">
                <Image src="/hero-image.svg" alt="" fill className="object-cover object-center select-none pointer-events-none opacity-60 dark:opacity-20" draggable={false} />

                <Link href="/" className="relative z-10 flex items-center w-fit">
                    <Image src="/logo-light-mode.svg" alt="QueueWise logo" width={48} height={48} draggable={false} className="select-none" />
                    <p className="text-xl font-bold text-black dark:text-zinc-50">QueueWise</p>
                </Link>

                <div className="relative z-10 flex flex-col gap-2 max-w-sm">
                    <Badge>Smart Queue. Better Experience</Badge>
                    <p className="text-3xl font-bold text-black dark:text-zinc-50">Join, Wait, <span className="text-violet-600 dark:text-violet-400">Get Served</span></p>
                    <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Give your visitors their time back and your staff a calmer counter.</p>
                </div>
            </div>

            <div className="flex flex-col flex-1 w-full lg:w-1/2">
                <div className="flex items-center justify-between px-4 py-2">
                    <Link href="/" className="flex items-center lg:invisible">
                        <Image src="/logo-light-mode.svg" alt="QueueWise logo" width={40} height={40} draggable={false} className="select-none" />
                        <p className="text-lg font-bold text-black dark:text-zinc-50">QueueWise</p>
                    </Link>
                    <ThemeToggle />
                </div>

                <main className="flex flex-1 items-center justify-center px-4 py-10">
                    <div className="w-full max-w-md flex flex-col gap-6">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-3xl font-bold text-black dark:text-zinc-50">
                                {title} <span className="text-violet-600 dark:text-violet-400">{highlight}</span>
                            </h1>
                            <p className="text-sm text-zinc-700 dark:text-zinc-400">{subtitle}</p>
                        </div>

                        {children}

                        <div className="text-xs text-center text-zinc-600 dark:text-zinc-400">{footer}</div>
                    </div>
                </main>
            </div>
        </div>
    );
}
