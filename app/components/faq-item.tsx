// Native <details> keeps the accordion accessible and keyboard-friendly without client JavaScript.
export default function FaqItem({ question, answer }: { question: string; answer: string }) {
    return (
        <details className="group bg-white dark:bg-zinc-900 shadow-lg rounded-xl box-border open:ring-1 open:ring-violet-300 dark:open:ring-violet-500/40">
            <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none select-none [&::-webkit-details-marker]:hidden">
                <span className="text-sm font-semibold text-black dark:text-zinc-50">{question}</span>
                <span className="bg-violet-200/80 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 h-7 aspect-square flex items-center justify-center rounded-lg text-sm shrink-0 transition-transform duration-300 group-open:rotate-45" aria-hidden="true">
                    +
                </span>
            </summary>

            <p className="px-5 pb-5 -mt-1 text-sm text-zinc-700 dark:text-zinc-400">{answer}</p>
        </details>
    );
}
