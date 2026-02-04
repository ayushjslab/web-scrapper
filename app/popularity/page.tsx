"use client";

import { useState } from "react";
import { TrendingUp, Globe, ShoppingCart, ShieldCheck, Calendar, Info, Users } from "lucide-react";
import UrlInput from "@/components/UrlInput";
import ScoreCard from "@/components/ScoreCard";
import MetricItem from "@/components/MetricItem";

export default function PopularityPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const analyzeWebsite = async (url: string) => {
        setLoading(true);
        setError(null);
        setData(null);

        try {
            const response = await fetch(`/api/popularity?url=${encodeURIComponent(url)}`);
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
                    <div className="p-4 bg-white/5 rounded-3xl border border-white/10 text-blue-400 shadow-2xl">
                        <TrendingUp size={40} />
                    </div>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight bg-linear-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent px-4">
                    Popularity & Brand Trust
                </h1>
                <p className="text-white/50 text-base md:text-xl max-w-2xl mx-auto italic px-6">
                    Deep analysis of website traffic indicators, brand recognition, and consumer trust signals.
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
                                <TrendingUp size={48} className="text-blue-400" />
                            </div>
                            <div className="absolute -top-2 -right-2 bg-blue-600 px-4 py-2 rounded-full font-bold text-lg shadow-xl border border-white/20">
                                {data.overallScore}
                            </div>
                        </div>
                        <div className="text-center">
                            <h2 className="text-2xl font-bold">{data.domain}</h2>
                            <p className="text-white/30 text-sm">Overall Popularity Score</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <ScoreCard
                            score={data.trafficAndPopularity.monthlyActiveUsers.score}
                            label="Audience Reach"
                            icon={<Users size={24} />}
                            description="Estimated monthly active users based on social presence and community activity."
                        />
                        <ScoreCard
                            score={data.trafficAndPopularity.globalRanking.score}
                            label="Global Ranking"
                            icon={<Globe size={24} />}
                            description="Indicator of website's authority and reach on a global scale."
                        />
                        <ScoreCard
                            score={data.trafficAndPopularity.marketShare.score}
                            label="Market Authority"
                            icon={<ShoppingCart size={24} />}
                            description="Brand leadership and enterprise-level indicators found on the site."
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Brand Details */}
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                                    <ShieldCheck size={20} />
                                </div>
                                <h3 className="text-xl font-bold uppercase tracking-wider text-white/90">Trust & Security</h3>
                            </div>
                            <div className="space-y-1">
                                <MetricItem label="HTTPS Secure" value={data.brandRecognitionAndTrust.userTrust.indicators.isHTTPS} />
                                <MetricItem label="Privacy Policy" value={data.brandRecognitionAndTrust.userTrust.indicators.hasPrivacyPolicy} />
                                <MetricItem label="Terms of Service" value={data.brandRecognitionAndTrust.userTrust.indicators.hasTermsOfService} />
                                <MetricItem label="Customer Support" value={data.brandRecognitionAndTrust.userTrust.indicators.hasCustomerSupport} />
                                <MetricItem label="Security Badges" value={data.brandRecognitionAndTrust.userTrust.indicators.hasSecurityBadges} />
                                <MetricItem label="Verified Reviews" value={data.brandRecognitionAndTrust.userTrust.indicators.hasVerifiedReviews} />
                                <MetricItem label="Professional Certs" value={data.brandRecognitionAndTrust.userTrust.indicators.hasCertifications} />
                            </div>
                        </div>

                        {/* Growth & Heritage */}
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                                    <Calendar size={20} />
                                </div>
                                <h3 className="text-xl font-bold uppercase tracking-wider text-white/90">Heritage & Presence</h3>
                            </div>
                            <div className="space-y-1">
                                <MetricItem label="Founded Year" value={data.brandRecognitionAndTrust.yearsInOperation.indicators.foundedYear} />
                                <MetricItem label="Years Active" value={data.brandRecognitionAndTrust.yearsInOperation.indicators.estimatedYearsActive} />
                                <MetricItem label="Social Media Count" value={data.brandRecognitionAndTrust.brandRecognition.indicators.socialMediaCount} />
                                <MetricItem label="Wikipedia Presence" value={data.brandRecognitionAndTrust.brandRecognition.indicators.hasWikipedia} />
                                <MetricItem label="App Store Links" value={data.brandRecognitionAndTrust.brandRecognition.indicators.hasAppStore} />
                                <MetricItem label="Physical Locations" value={data.brandRecognitionAndTrust.brandRecognition.indicators.hasPhysicalLocation} />
                                <MetricItem label="Press Coverage" value={data.brandRecognitionAndTrust.brandRecognition.indicators.hasPressPage} />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-4 text-white/20 text-sm">
                        <span className="flex items-center gap-1.5"><Info size={14} /> Analysis ID: {Math.random().toString(36).substring(7)}</span>
                        <span className="flex items-center gap-1.5"><Calendar size={14} /> Analyzed on: {new Date(data.metadata.timestamp).toLocaleString()}</span>
                        <span>Fetch Time: {data.metadata.fetchTime}</span>
                    </div>
                </div>
            )}
        </div>
    );
}