"use client";

import { useState } from "react";
import { Search, Loader2, Link as LinkIcon } from "lucide-react";

interface UrlInputProps {
    onAnalyze: (url: string) => void;
    isLoading: boolean;
    placeholder?: string;
}

const UrlInput = ({ onAnalyze, isLoading, placeholder }: UrlInputProps) => {
    const [url, setUrl] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (url.trim()) {
            onAnalyze(url.trim());
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto mb-12">
            <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/40 group-focus-within:text-blue-400 transition-colors">
                    <LinkIcon size={20} />
                </div>
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={placeholder || "Enter website URL..."}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 md:py-5 pl-12 pr-28 md:pr-40 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10 transition-all text-base md:text-lg"
                    disabled={isLoading}
                />
                <div className="absolute right-1.5 md:right-2 inset-y-1.5 md:inset-y-2">
                    <button
                        type="submit"
                        disabled={isLoading || !url.trim()}
                        className="h-full px-4 md:px-8 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 text-white rounded-xl font-semibold flex items-center gap-2 transition-all active:scale-95"
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <Search size={20} />
                        )}
                        <span className="hidden md:inline">{isLoading ? "Analyzing..." : "Analyze"}</span>
                    </button>
                </div>
            </div>
        </form>
    );
};

export default UrlInput;
