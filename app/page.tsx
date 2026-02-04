"use client";

import { useState } from "react";
import { Search, Loader2, Link as LinkIcon, Image as ImageIcon, Info, Camera } from "lucide-react";

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScreenshot = async () => {
    if (!url) {
      setError("Please enter a valid URL.");
      return;
    }
    if (!/^https?:\/\//i.test(url.trim())) {
      setError("URL must start with http:// or https://");
      return;
    }
    try {
      new URL(url.trim());
    } catch {
      setError("Invalid URL format. Please enter a valid URL.");
      return;
    }
    setLoading(true);
    setError(null);
    setScreenshot(null);

    try {
      const response = await fetch(
        `/api/screenshot?url=${encodeURIComponent(url)}`
      );
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(
            "Rate limit reached. Please try again later."
          );
        }
        throw new Error("Failed to capture screenshot.");
      }
      const blob = await response.blob();
      setScreenshot(URL.createObjectURL(blob));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12">
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-white/5 rounded-3xl border border-white/10 text-white shadow-2xl">
            <Camera size={40} />
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight bg-linear-to-b from-white to-white/50 bg-clip-text text-transparent px-4">
          Website Visual Analyzer
        </h1>
        <p className="text-white/50 text-base md:text-xl max-w-2xl mx-auto leading-relaxed px-6 italic">
          Instantly capture pixel-perfect screenshots and analyze visual elements of any website with our headless browser engine.
        </p>
      </div>

      <div className="w-full max-w-3xl mx-auto px-4">
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/40 group-focus-within:text-blue-400 transition-colors">
            <LinkIcon size={20} />
          </div>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://vercel.com"
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 md:py-5 pl-12 pr-28 md:pr-40 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10 transition-all text-base md:text-lg"
            disabled={loading}
          />
          <div className="absolute right-1.5 md:right-2 inset-y-1.5 md:inset-y-2">
            <button
              onClick={handleScreenshot}
              disabled={loading}
              className="h-full px-4 md:px-8 bg-white text-black hover:bg-white/90 disabled:bg-white/10 disabled:text-white/30 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Search size={20} />
              )}
              <span className="hidden md:inline">{loading ? "Capturing..." : "Capture"}</span>
            </button>
          </div>
        </div>
        {error && <p className="text-rose-400 mt-4 text-center bg-rose-400/10 border border-rose-400/20 py-2 rounded-lg text-sm">{error}</p>}
      </div>

      {screenshot && (
        <div className="max-w-5xl mx-auto mt-12 md:mt-16 animate-in fade-in slide-in-from-bottom-8 duration-700 px-4">
          <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 md:p-6 bg-white/5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                  <ImageIcon size={20} />
                </div>
                <h2 className="text-lg md:text-xl font-bold text-white">Preview</h2>
              </div>
              <div className="flex gap-1.5 md:gap-2">
                <div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-rose-500/40"></div>
                <div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-amber-500/40"></div>
                <div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-emerald-500/40"></div>
              </div>
            </div>
            <div className="p-2 md:p-4">
              <img
                src={screenshot || "/placeholder.svg"}
                alt="Website screenshot"
                className="w-full rounded-xl border border-white/5"
              />
            </div>
          </div>

          <div className="mt-6 md:mt-8 flex flex-col md:flex-row justify-center items-center gap-4 md:gap-6 text-white/40 text-xs md:text-sm text-center">
            <span className="flex items-center gap-2"><Info size={14} /> Captured via Puppeteer Core</span>
            <span className="flex items-center gap-2 max-w-xs truncate"><LinkIcon size={14} /> {url}</span>
          </div>
        </div>
      )}
    </div>
  );
}
