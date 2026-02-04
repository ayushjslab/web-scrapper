"use client";

import { useState } from "react";
import { Zap, Smartphone, Accessibility, Maximize, Info, Gauge, Monitor, Image, Cpu } from "lucide-react";
import UrlInput from "@/components/UrlInput";
import ScoreCard from "@/components/ScoreCard";
import MetricItem from "@/components/MetricItem";

export default function UxPerformancePage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const analyzeWebsite = async (url: string) => {
        setLoading(true);
        setError(null);
        setData(null);

        try {
            const response = await fetch(`/api/ux-performance?url=${encodeURIComponent(url)}`);
            if (!response.ok) throw new Error("Failed to analyze website");
            const result = await response.json();
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-12">
            <div className="text-center space-y-4">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-white/5 rounded-3xl border border-white/10 text-amber-400 shadow-2xl">
                        <Zap size={40} />
                    </div>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight bg-linear-to-r from-amber-400 to-rose-400 bg-clip-text text-transparent px-4">
                    UX & Core Web Performance
                </h1>
                <p className="text-white/50 text-base md:text-xl max-w-2xl mx-auto italic px-6">
                    Deep audit of page speed, mobile responsiveness, and user experience accessibility.
                </p>
            </div>

            <UrlInput onAnalyze={analyzeWebsite} isLoading={loading} />

            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-2xl text-center max-w-2xl mx-auto">
                    {error}
                </div>
            )}

            {data && (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Overall Score Header */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <div className="p-8 bg-white/5 rounded-full border border-white/10">
                                <Gauge size={48} className="text-amber-400" />
                            </div>
                            <div className="absolute -top-2 -right-2 bg-amber-600 px-4 py-2 rounded-full font-bold text-lg shadow-xl border border-white/20">
                                {data.uxScore}
                            </div>
                        </div>
                        <div className="text-center">
                            <h2 className="text-2xl font-bold truncate max-w-md">{new URL(data.url).hostname}</h2>
                            <p className="text-white/30 text-sm">UX Experience Index</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <ScoreCard
                            score={data.breakdown.categories.performance.score}
                            label="Performance"
                            icon={<Zap size={24} />}
                            description="Page speed and resource efficiency."
                        />
                        <ScoreCard
                            score={data.breakdown.categories.mobile.score}
                            label="Mobile Ready"
                            icon={<Smartphone size={24} />}
                            description="Responsiveness and touch-friendliness."
                        />
                        <ScoreCard
                            score={data.breakdown.categories.accessibility.score}
                            label="Accessibility"
                            icon={<Accessibility size={24} />}
                            description="Inclusive design and semantic structure."
                        />
                        <ScoreCard
                            score={data.breakdown.categories.visual.score}
                            label="Visual richness"
                            icon={<Maximize size={24} />}
                            description="Aesthetic quality and animation usage."
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Technical Metrics */}
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
                                    <Monitor size={20} />
                                </div>
                                <h3 className="text-xl font-bold uppercase tracking-wider text-white/90">Technical Audit</h3>
                            </div>
                            <div className="space-y-1">
                                <MetricItem label="Initial Load Time" value={data.breakdown.categories.performance.details.loadTime} />
                                <MetricItem label="Page Size (HTML)" value={data.breakdown.categories.performance.details.pageSize} />
                                <MetricItem label="JS Scripts" value={data.breakdown.categories.performance.details.resources.scripts} />
                                <MetricItem label="Style Sheets" value={data.breakdown.categories.performance.details.resources.styles} />
                                <MetricItem label="DOM Nodes" value={data.breakdown.categories.performance.details.resources.domNodes} />
                            </div>
                        </div>

                        {/* Assets Audit */}
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400">
                                    <Image size={20} />
                                </div>
                                <h3 className="text-xl font-bold uppercase tracking-wider text-white/90">Media & Assets</h3>
                            </div>
                            <div className="space-y-1">
                                <MetricItem label="Total Images" value={data.metrics.images.total} />
                                <MetricItem label="Lazy Loaded" value={data.metrics.images.lazy} />
                                <MetricItem label="Alt Text Coverage" value={`${(data.metrics.images.withAlt / (data.metrics.images.total || 1) * 100).toFixed(0)}%`} />
                                <MetricItem label="SVG Elements" value={data.metrics.visual.details.svgCount} />
                                <MetricItem label="Video Content" value={data.metrics.visual.details.videoCount > 0 ? "Yes" : "No"} />
                            </div>
                        </div>

                        {/* Mobile & UX details */}
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                                    <Cpu size={20} />
                                </div>
                                <h3 className="text-xl font-bold uppercase tracking-wider text-white/90">UX Features</h3>
                            </div>
                            <div className="space-y-1">
                                <MetricItem label="Viewport Meta" value={data.metrics.mobile.details.hasViewport} />
                                <MetricItem label="Responsive Classes" value={data.metrics.mobile.details.hasResponsiveClass} />
                                <MetricItem label="Semantic Tags" value={data.metrics.accessibility.details.semanticTags} />
                                <MetricItem label="ARIA Attributes" value={data.metrics.accessibility.details.ariaElements} />
                                <MetricItem label="Animations" value={data.metrics.visual.details.hasAnimations} />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-4 text-white/20 text-sm">
                        <span className="flex items-center gap-1.5"><Info size={14} /> Analysis ID: {Math.random().toString(36).substring(7)}</span>
                        <span className="flex items-center gap-1.5"><Gauge size={14} /> Analyzed on: {new Date(data.timestamp).toLocaleString()}</span>
                    </div>
                </div>
            )}
        </div>
    );
}