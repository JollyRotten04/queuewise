export default function StatCard({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon: string }) {
    return (
        <div className="bg-white dark:bg-zinc-900 shadow-lg rounded-xl p-4 sm:p-5 box-border flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{label}</p>
                <span className="bg-violet-200/80 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 h-8 aspect-square flex items-center justify-center rounded-lg text-sm" aria-hidden="true">{icon}</span>
            </div>

            <p className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50">{value}</p>

            {hint && <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>}
        </div>
    );
}
