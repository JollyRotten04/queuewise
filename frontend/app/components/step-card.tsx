import Badge from "./badge";

export default function StepCard({ step, tag, title, description }: { step: number; tag: string; title: string; description: string }) {
    return (
        <div className="flex flex-col w-full h-full p-6 sm:p-8 box-border bg-white dark:bg-zinc-900 shadow-lg rounded-xl gap-4">

            <div className="flex justify-between items-center gap-2">

                <div className="bg-violet-600 h-10 aspect-square flex items-center justify-center text-white text-lg font-bold p-2 rounded-xl shadow">{step}</div>

                <Badge>{tag}</Badge>
            </div>

            <div className="flex flex-col gap-1">

                <h3 className="text-lg font-semibold text-black dark:text-zinc-50 text-start">
                    {title}
                </h3>

                <p className="text-sm font-normal text-zinc-700 dark:text-zinc-400 text-start">
                    {description}
                </p>
            </div>
        </div>
    );
}
