"use client";

import { ReactNode } from "react";

interface ScoreCardProps {
    score: number;
    label: string;
    icon: ReactNode;
    description?: string;
}

const ScoreCard = ({ score, label, icon, description }: ScoreCardProps) => {
    const getScoreColor = (s: number) => {
        if (s >= 80) return "text-emerald-400";
        if (s >= 60) return "text-amber-400";
        return "text-rose-400";
    };

    const getBgColor = (s: number) => {
        if (s >= 80) return "from-emerald-500/20 to-emerald-500/5";
        if (s >= 60) return "from-amber-500/20 to-amber-500/5";
        return "from-rose-500/20 to-rose-500/5";
    };

    return (
        <div className={`relative overflow-hidden bg-linear-to-br ${getBgColor(score)} border border-white/10 rounded-3xl p-6 transition-all hover:border-white/20 hover:scale-[1.02] group`}>
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-white/5 rounded-2xl text-white/80 group-hover:text-white transition-colors">
                    {icon}
                </div>
                <div className={`text-3xl font-bold ${getScoreColor(score)}`}>
                    {score}
                    <span className="text-sm opacity-50 ml-1">/100</span>
                </div>
            </div>
            <div>
                <h3 className="text-xl font-bold text-white mb-2">{label}</h3>
                {description && <p className="text-white/50 text-sm leading-relaxed">{description}</p>}
            </div>

            {/* Progress bar background */}
            <div className="mt-6 h-2 w-full bg-white/5 rounded-full overflow-hidden">
                {/* Progress bar fill */}
                <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out bg-current ${getScoreColor(score)}`}
                    style={{ width: `${score}%` }}
                />
            </div>
        </div>
    );
};

export default ScoreCard;
