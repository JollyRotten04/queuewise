"use client";

import { useMemo } from "react";
import { encode } from "uqr";

// QR code for a URL, drawn as inline SVG from the module grid (no HTML strings injected).
// Always dark-on-white with a quiet zone, even in dark mode, so phone cameras can read it.
export default function JoinQr({ url, label, className = "" }: { url: string; label: string; className?: string }) {
    const { size, path } = useMemo(() => {
        const qr = encode(url, { ecc: "M", border: 4 });
        let d = "";
        qr.data.forEach((row, y) => {
            row.forEach((dark, x) => {
                if (dark) d += `M${x} ${y}h1v1h-1z`;
            });
        });
        return { size: qr.size, path: d };
    }, [url]);

    return (
        <svg
            viewBox={`0 0 ${size} ${size}`}
            role="img"
            aria-label={label}
            shapeRendering="crispEdges"
            className={`block aspect-square rounded-lg ${className}`}
        >
            <rect width={size} height={size} fill="#ffffff" />
            <path d={path} fill="#000000" />
        </svg>
    );
}
