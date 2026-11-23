"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { SLUG_PATTERN } from "./types";

// Public branch used when a link has no ?b=... (created by `npm run db:seed` in the backend).
export const DEFAULT_BRANCH = process.env.NEXT_PUBLIC_DEFAULT_BRANCH ?? "main";

export class ApiError extends Error {
    constructor(public status: number, message: string, public field?: string) {
        super(message);
    }
}

// Calls the Express API through the Next.js /api rewrite. The session is an HttpOnly cookie the browser sends
// automatically; this code never sees or stores it.
export async function api<T>(path: string, { method = "GET", body, signal }: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
    let res: Response;
    try {
        res = await fetch(`/api${path}`, {
            method,
            headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
            body: body !== undefined ? JSON.stringify(body) : undefined,
            credentials: "same-origin",
            cache: "no-store",
            signal,
        });
    } catch (error) {
        if ((error as Error).name === "AbortError") throw error;
        throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
    }

    if (res.status === 204) return undefined as T;
    const data = (await res.json().catch(() => null)) as { error?: string; field?: string } | null;
    if (!res.ok) {
        throw new ApiError(res.status, data?.error ?? "Something went wrong. Please try again.", data?.field);
    }
    return data as T;
}

export function errorMessage(error: unknown) {
    return error instanceof ApiError ? error.message : "Something went wrong. Please try again.";
}

// Branch slug from ?b=..., validated before it goes into any URL.
export function useBranchSlug() {
    const value = useSearchParams().get("b");
    return value && SLUG_PATTERN.test(value) ? value : DEFAULT_BRANCH;
}

export function branchPath(slug: string) {
    return `/branches/${encodeURIComponent(slug)}`;
}

// Re-runs `refresh` when the branch's live stream says something changed, plus a slow poll as a fallback
// (some proxies buffer event streams).
export function useLiveRefresh(slug: string | null, refresh: () => void, pollMs = 15000) {
    const refreshRef = useRef(refresh);
    useEffect(() => {
        refreshRef.current = refresh;
    });

    useEffect(() => {
        if (!slug) return;
        const source = new EventSource(`/api${branchPath(slug)}/events`);
        source.addEventListener("change", () => refreshRef.current());
        const timer = setInterval(() => refreshRef.current(), pollMs);
        return () => {
            source.close();
            clearInterval(timer);
        };
    }, [slug, pollMs]);
}
