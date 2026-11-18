

export default function Header(){
    return(
        <header className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-600 w-full h-fit">
            <div className="container mx-auto px-4 py-2 flex justify-between">
                <p className="text-xl font-bold text-black dark:text-zinc-50">QueueWise</p>

                <div className="ml-auto flex items-center space-x-4">
                    <p className="text-xs font-semibold text-black dark:text-zinc-50">Features</p>

                    <p className="text-xs font-semibold text-black dark:text-zinc-50">How It Works</p>

                    <p className="text-xs font-semibold text-black dark:text-zinc-50">Pricing</p>

                    <p className="text-xs font-semibold text-black dark:text-zinc-50">About</p>
                </div>

                <div className="ml-auto flex items-center space-x-4">
                    <p className="text-xs font-semibold text-black dark:text-zinc-50">Login</p>

                    <button className="bg-violet-500 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold">Get Started</button>
                </div>
            </div>
        </header>
    );
}