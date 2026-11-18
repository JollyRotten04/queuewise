export default function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`bg-violet-200/80 dark:bg-violet-500/20 px-2.5 py-1.5 h-fit w-fit rounded-lg ${className}`}>
            <p className="text-violet-600 dark:text-violet-300 font-semibold text-xs text-center">
                {children}
            </p>
        </div>
    );
}
