export default function ContentCard({ title, description, icon }: { title: string; description: string; icon: string }) {
    return (
        <div className="bg-white dark:bg-zinc-900 shadow-lg rounded-xl p-4 box-border items-center min-h-[130px] w-full flex flex-col gap-4 overflow-hidden">
            <p className="text-violet-600 dark:text-violet-400 text-2xl select-none" draggable={false} aria-hidden="true">
                {icon}
            </p>

            <div className="flex flex-col">
                <p className="text-sm text-center text-zinc-700 dark:text-zinc-200 font-semibold" draggable={false}>
                    {title}
                </p>

                <p className="text-xs text-center text-zinc-500 dark:text-zinc-400" draggable={false}>
                    {description}
                </p>
            </div>
        </div>
    );
}
