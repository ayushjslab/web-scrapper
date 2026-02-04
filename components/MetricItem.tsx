"use client";

import { Check, X, Minus } from "lucide-react";

interface MetricItemProps {
    label: string;
    value: any;
    type?: "boolean" | "number" | "text";
}

const MetricItem = ({ label, value, type = "text" }: MetricItemProps) => {
    const renderValue = () => {
        if (typeof value === "boolean") {
            return value ? (
                <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider">
                    <Check size={12} /> Yes
                </div>
            ) : (
                <div className="flex items-center gap-1.5 text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider">
                    <X size={12} /> No
                </div>
            );
        }

        if (value === "Not available" || value === "Unknown" || value === null || value === undefined) {
            return (
                <div className="flex items-center gap-1.5 text-white/30 px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider">
                    <Minus size={12} /> N/A
                </div>
            );
        }

        return <span className="text-white/80 font-medium">{value}</span>;
    };

    return (
        <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
            <span className="text-white/50 text-sm">{label}</span>
            {renderValue()}
        </div>
    );
};

export default MetricItem;
