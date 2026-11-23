"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, api } from "../../lib/api";
import type { Me } from "../../lib/types";

// Sends the user to login when the API says the session is missing or expired.
export function useLoginRedirect() {
    const router = useRouter();
    const pathname = usePathname();
    return (error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
            router.replace(`/login?${new URLSearchParams({ next: pathname })}`);
            return true;
        }
        return false;
    };
}

export default function StaffMenu() {
    const router = useRouter();
    const redirectIfLoggedOut = useLoginRedirect();
    const [me, setMe] = useState<Me | null>(null);
    const [signingOut, setSigningOut] = useState(false);

    useEffect(() => {
        api<Me>("/auth/me").then(setMe).catch(redirectIfLoggedOut);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function signOut() {
        setSigningOut(true);
        await api("/auth/logout", { method: "POST", body: {} }).catch(() => {});
        router.replace("/login");
    }

    const branchQuery = me ? `?${new URLSearchParams({ b: me.branch.slug })}` : "";

    return (
        <div className="flex items-center gap-3">
            <Link href={`/display${branchQuery}`} target="_blank" rel="noopener noreferrer" className="hidden md:inline text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline">Open Lobby Display ↗</Link>

            <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-semibold text-black dark:text-zinc-50">{me?.user.name ?? "…"}</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{me ? `${me.branch.name} · ${me.user.role === "admin" ? "Admin" : "Staff"}` : ""}</span>
            </div>

            <button type="button" onClick={signOut} disabled={signingOut} className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer disabled:opacity-60">
                {signingOut ? "Signing out…" : "Sign out"}
            </button>
        </div>
    );
}
