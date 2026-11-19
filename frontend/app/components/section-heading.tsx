import Badge from "./badge";

export default function SectionHeading({ badge, title, highlight, description }: { badge: string; title: string; highlight?: string; description: string }) {
    return (
        <div className="flex flex-col gap-4 items-center max-w-2xl mx-auto">
            <Badge>{badge}</Badge>

            <h2 className="text-3xl sm:text-4xl font-bold text-black dark:text-zinc-50 text-center">
                {title} {highlight && <span className="text-violet-600 dark:text-violet-400">{highlight}</span>}
            </h2>

            <p className="font-normal text-sm text-zinc-700 dark:text-zinc-400 text-center">
                {description}
            </p>
        </div>
    );
}
