"use client";

import { useState } from "react";
import { FileText, CheckCircle, Clock, Link as LinkIcon, Info, Layout, Layers, Hash } from "lucide-react";
import UrlInput from "@/components/UrlInput";
import ScoreCard from "@/components/ScoreCard";
import MetricItem from "@/components/MetricItem";

export default function ContentQualityPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeWebsite = async (url: string) => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch(`/api/headings?url=${encodeURIComponent(url)}`);
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
          <div className="p-4 bg-white/5 rounded-3xl border border-white/10 text-purple-400 shadow-2xl">
            <FileText size={40} />
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent px-4">
          Content Quality & Engagement
        </h1>
        <p className="text-white/50 text-base md:text-xl max-w-2xl mx-auto italic px-6">
          Advanced evaluation of content depth, structural integrity, and potential user engagement.
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
                <FileText size={48} className="text-purple-400" />
              </div>
              <div className="absolute -top-2 -right-2 bg-purple-600 px-4 py-2 rounded-full font-bold text-lg shadow-xl border border-white/20">
                {data.overallScore}
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold truncate max-w-md">{new URL(data.url).hostname}</h2>
              <p className="text-white/30 text-sm">Content Quality Index</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ScoreCard
              score={data.contentQuality.comprehensiveness.score}
              label="Depth & Scope"
              icon={<Layers size={24} />}
              description="Measures the detail and structural richness of the content."
            />
            <ScoreCard
              score={data.contentQuality.accuracy.score}
              label="Trust signals"
              icon={<CheckCircle size={24} />}
              description="Analysis of metadata, JSON-LD, and authoritative linking patterns."
            />
            <ScoreCard
              score={data.engagement.timeOnSite.score}
              label="Engagement potential"
              icon={<Clock size={24} />}
              description="Estimated user retention based on reading time and interactive elements."
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Structural Analysis */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                  <Layout size={20} />
                </div>
                <h3 className="text-xl font-bold uppercase tracking-wider text-white/90">Structural Integrity</h3>
              </div>
              <div className="space-y-1">
                <MetricItem label="Word Count" value={data.contentQuality.comprehensiveness.indicators.wordCount} />
                <MetricItem label="Heading Count" value={data.contentQuality.comprehensiveness.indicators.headingHierarchy.total} />
                <MetricItem label="Lists Found" value={data.contentQuality.comprehensiveness.indicators.structuralElements.lists} />
                <MetricItem label="Quotes/Citations" value={data.contentQuality.comprehensiveness.indicators.structuralElements.quotes} />
                <MetricItem label="Tables" value={data.contentQuality.comprehensiveness.indicators.structuralElements.tables} />
                <MetricItem label="Code Blocks" value={data.contentQuality.comprehensiveness.indicators.structuralElements.codeBlocks} />
                <MetricItem label="Freshness Score" value={data.contentQuality.freshness.score} />
              </div>
            </div>

            {/* Engagement Metrics */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-500/20 rounded-lg text-pink-400">
                  <Hash size={20} />
                </div>
                <h3 className="text-xl font-bold uppercase tracking-wider text-white/90">Authoritative signals</h3>
              </div>
              <div className="space-y-1">
                <MetricItem label="Internal Links" value={data.contentQuality.accuracy.indicators.linkAnalysis.internal} />
                <MetricItem label="External Links" value={data.contentQuality.accuracy.indicators.linkAnalysis.external} />
                <MetricItem label="OpenGraph Data" value={data.contentQuality.accuracy.indicators.metadataPresence.hasOG} />
                <MetricItem label="Twitter Cards" value={data.contentQuality.accuracy.indicators.metadataPresence.hasTwitter} />
                <MetricItem label="JSON-LD Schema" value={data.contentQuality.accuracy.indicators.metadataPresence.hasJSONLD} />
                <MetricItem label="Images" value={data.engagement.timeOnSite.indicators.mediaMetrics.images} />
                <MetricItem label="Videos" value={data.engagement.timeOnSite.indicators.mediaMetrics.videos} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-4 text-white/20 text-sm">
            <span className="flex items-center gap-1.5"><Info size={14} /> Analysis ID: {Math.random().toString(36).substring(7)}</span>
            <span className="flex items-center gap-1.5"><Clock size={14} /> Analyzed on: {new Date(data.metadata.timestamp).toLocaleString()}</span>
            <span>Load Time: {data.metadata.loadTime}</span>
          </div>
        </div>
      )}
    </div>
  );
}