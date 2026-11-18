import Link from "next/link";
import { primaryButton } from "../lib/styles";

export default function PricingCard({ name, price, period, description, features, highlighted = false }: { name: string; price: string; period?: string; description: string; features: string[]; highlighted?: boolean }) {
    return (
        <div className={`relative flex flex-col gap-6 p-6 sm:p-8 rounded-xl shadow-lg box-border h-full ${highlighted ? "bg-violet-600 text-white" : "bg-white dark:bg-zinc-900"}`}>
            {highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-violet-600 text-xs font-semibold px-2.5 py-1 rounded-lg shadow">
                    Most Popular
                </span>
            )}

            <div className="flex flex-col gap-1">
                <h3 className={`text-lg font-semibold ${highlighted ? "text-white" : "text-black dark:text-zinc-50"}`}>{name}</h3>

                <p className={`text-sm ${highlighted ? "text-violet-100" : "text-zinc-700 dark:text-zinc-400"}`}>{description}</p>
            </div>

            <p className={`text-4xl font-bold ${highlighted ? "text-white" : "text-black dark:text-zinc-50"}`}>
                {price}
                {period && <span className={`text-sm font-normal ${highlighted ? "text-violet-100" : "text-zinc-500"}`}> {period}</span>}
            </p>

            <ul className="flex flex-col gap-2 flex-1">
                {features.map((feature) => (
                    <li key={feature} className={`flex gap-2 text-sm ${highlighted ? "text-violet-50" : "text-zinc-700 dark:text-zinc-300"}`}>
                        <span aria-hidden="true" className={highlighted ? "text-white" : "text-violet-600 dark:text-violet-400"}>✓</span>
                        {feature}
                    </li>
                ))}
            </ul>

            <Link
                href="/signup"
                className={highlighted
                    ? "inline-flex items-center justify-center w-full bg-white rounded-full px-4 py-2 text-violet-600 text-xs font-semibold select-none hover:scale-105 transition-transform duration-300 ease-in-out"
                    : `${primaryButton} w-full hover:scale-105`}
            >
                Choose {name}
            </Link>
        </div>
    );
}
