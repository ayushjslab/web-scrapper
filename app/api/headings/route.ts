/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

// URL to the Chromium binary package hosted in /public, if not in production, use a fallback URL
const CHROMIUM_PACK_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/chromium-pack.tar`
    : "https://github.com/gabenunez/puppeteer-on-vercel/raw/refs/heads/main/example/chromium-dont-use-in-prod.tar";

// Cache the Chromium executable path to avoid re-downloading on subsequent requests
let cachedExecutablePath: string | null = null;
let downloadPromise: Promise<string> | null = null;

async function getChromiumPath(): Promise<string> {
    if (cachedExecutablePath) return cachedExecutablePath;

    if (!downloadPromise) {
        const chromium = (await import("@sparticuz/chromium-min")).default;
        downloadPromise = chromium
            .executablePath(CHROMIUM_PACK_URL)
            .then((path) => {
                cachedExecutablePath = path;
                console.log("Chromium path resolved:", path);
                return path;
            })
            .catch((error) => {
                console.error("Failed to get Chromium path:", error);
                downloadPromise = null;
                throw error;
            });
    }

    return downloadPromise;
}

function calculateOverallScore(engagement: any, quality: any) {
    // Weighted average
    const engagementWeight = 0.4;
    const qualityWeight = 0.6;

    const engagementAvg = (
        engagement.timeOnSiteScore +
        engagement.bounceRateScore +
        engagement.returnVisitorScore
    ) / 3;

    const qualityAvg = (
        quality.comprehensivenessScore +
        quality.accuracyScore +
        quality.freshnessScore
    ) / 3;

    return Math.round(
        (engagementAvg * engagementWeight) +
        (qualityAvg * qualityWeight)
    );
}

/**
 * API endpoint to evaluate user engagement and content quality.
 * Usage: /api/headings?url=https://example.com
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const urlParam = searchParams.get("url");

    if (!urlParam) {
        return NextResponse.json({ error: "Please provide a URL." }, { status: 400 });
    }

    let inputUrl = urlParam.trim();
    if (!/^https?:\/\//i.test(inputUrl)) {
        inputUrl = `http://${inputUrl}`;
    }

    let parsedUrl: URL;
    try {
        parsedUrl = new URL(inputUrl);
    } catch {
        return NextResponse.json({ error: "Invalid URL provided." }, { status: 400 });
    }

    let browser;
    try {
        const startTime = Date.now();
        const isVercel = !!process.env.VERCEL_ENV;
        let puppeteer: any,
            launchOptions: any = {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            };

        if (isVercel) {
            const chromium = (await import("@sparticuz/chromium-min")).default;
            puppeteer = await import("puppeteer-core");
            const executablePath = await getChromiumPath();
            launchOptions = {
                ...launchOptions,
                args: [...chromium.args, ...launchOptions.args],
                executablePath,
            };
        } else {
            puppeteer = await import("puppeteer");
        }

        browser = await puppeteer.launch(launchOptions);
        const page = await browser.newPage();

        await page.setViewport({ width: 1280, height: 800 });

        // Navigation - wait for 'load' to ensure more content is ready
        await page.goto(parsedUrl.toString(), {
            waitUntil: "load",
            timeout: 60000
        });

        // Sufficient delay for JS execution/hydration
        await new Promise(resolve => setTimeout(resolve, 3000));

        const loadTime = Date.now() - startTime;

        // Perform analysis in the browser context
        const metrics = await page.evaluate(() => {
            const getText = () => {
                const body = document.body;
                if (!body) return "";
                return body.innerText || "";
            };

            const textContent = getText();
            const wordCount = textContent.split(/\s+/).filter(w => w.length > 2).length;

            // Media & Interactive Elements
            const images = document.querySelectorAll('img').length;
            const videos = document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length;
            const audio = document.querySelectorAll('audio').length;
            const buttons = document.querySelectorAll('button, input[type="button"], input[type="submit"], .btn, .button').length;
            const forms = document.querySelectorAll('form').length;
            const inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea').length;

            // Structural Elements
            const headers = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
            const lists = document.querySelectorAll('ul, ol').length;
            const listItems = document.querySelectorAll('li').length;
            const tables = document.querySelectorAll('table').length;
            const quotes = document.querySelectorAll('blockquote, q').length;
            const codeBlocks = document.querySelectorAll('pre, code').length;

            // Links
            const allLinks = Array.from(document.querySelectorAll('a[href]'));
            const internalLinks = allLinks.filter(a => (a as HTMLAnchorElement).href.includes(window.location.hostname)).length;
            const externalLinks = allLinks.length - internalLinks;

            // Metadata
            const hasOG = !!document.querySelector('meta[property^="og:"]');
            const hasTwitter = !!document.querySelector('meta[name^="twitter:"]');
            const hasJSONLD = !!document.querySelector('script[type="application/ld+json"]');

            // Engagement analysis
            const getEngagement = () => {
                let timeOnSite = 5;
                const readingTimeMinutes = Math.ceil(wordCount / 200);
                if (wordCount > 1000) timeOnSite += 25;
                else if (wordCount > 500) timeOnSite += 15;

                timeOnSite += Math.min(videos * 15, 45);
                timeOnSite += Math.min(images * 2, 20);

                if (document.querySelector('nav')) timeOnSite += 10;

                let bounceRate = 100;
                if (document.querySelector('nav')) bounceRate -= 15;
                if (inputs > 0) bounceRate -= 15;
                if (buttons > 0) bounceRate -= 10;
                if (document.querySelector('meta[name="viewport"]')) bounceRate -= 10;

                let returnVisitor = 0;
                if (document.querySelector('[href*="login"], [href*="signin"], .account, .profile')) returnVisitor += 30;
                if (document.querySelector('.newsletter, [href*="subscribe"], form[id*="subscribe"]')) returnVisitor += 25;
                if (document.querySelector('a[href*="blog"], a[href*="article"]')) returnVisitor += 15;

                return {
                    timeOnSiteScore: Math.min(100, timeOnSite),
                    bounceRateScore: Math.min(100, Math.max(0, 100 - (bounceRate - 50))),
                    returnVisitorScore: Math.min(100, returnVisitor),
                    details: {
                        wordCount,
                        readingTimeMinutes,
                        media: { images, videos, audio },
                        interactions: { buttons, forms, inputs }
                    }
                };
            };

            // Quality analysis
            const getQuality = () => {
                let comprehensiveness = 0;
                if (wordCount > 1500) comprehensiveness += 30;
                else if (wordCount > 800) comprehensiveness += 20;

                const hLevels = headers.map(h => parseInt(h.tagName[1]));
                const hCount = headers.length;
                comprehensiveness += Math.min(hCount * 4, 25);

                if (tables > 0) comprehensiveness += 10;
                if (lists > 0) comprehensiveness += 10;
                if (codeBlocks > 0) comprehensiveness += 10;
                if (quotes > 0) comprehensiveness += 5;

                let accuracy = 0;
                if (document.querySelector('.author, [rel="author"], .byline')) accuracy += 20;
                if (externalLinks > 5) accuracy += 20;
                if (hasJSONLD) accuracy += 25;
                if (window.location.protocol === 'https:') accuracy += 15;
                if (document.querySelector('[href*="privacy"], [href*="terms"], [href*="legal"]')) accuracy += 20;

                let freshness = 0;
                const currentYear = new Date().getFullYear().toString();
                if (textContent.includes(currentYear)) freshness += 40;
                if (document.querySelector('.post-date, .updated, time, [datetime]')) freshness += 40;
                if (document.querySelector('meta[property="article:published_time"]')) freshness += 20;

                return {
                    comprehensivenessScore: Math.min(100, comprehensiveness),
                    accuracyScore: Math.min(100, accuracy),
                    freshnessScore: Math.min(100, freshness),
                    details: {
                        headingStats: {
                            total: hCount,
                            levels: hLevels.reduce((acc: any, curr) => {
                                acc[`h${curr}`] = (acc[`h${curr}`] || 0) + 1;
                                return acc;
                            }, {})
                        },
                        structure: { lists, listItems, tables, quotes, codeBlocks },
                        links: { internal: internalLinks, external: externalLinks },
                        metadata: { hasOG, hasTwitter, hasJSONLD }
                    }
                };
            };

            return {
                engagement: getEngagement(),
                quality: getQuality()
            };
        });

        const overallScore = calculateOverallScore(metrics.engagement, metrics.quality);

        return NextResponse.json({
            url: parsedUrl.toString(),
            overallScore,
            engagement: {
                timeOnSite: {
                    score: metrics.engagement.timeOnSiteScore,
                    indicators: {
                        wordCount: metrics.engagement.details.wordCount,
                        readingTimeMinutes: metrics.engagement.details.readingTimeMinutes,
                        mediaMetrics: metrics.engagement.details.media
                    }
                },
                bounceRate: {
                    score: metrics.engagement.bounceRateScore,
                    indicators: {
                        interactionElements: metrics.engagement.details.interactions
                    }
                },
                returnVisitor: {
                    score: metrics.engagement.returnVisitorScore
                }
            },
            contentQuality: {
                comprehensiveness: {
                    score: metrics.quality.comprehensivenessScore,
                    indicators: {
                        wordCount: metrics.engagement.details.wordCount,
                        headingHierarchy: metrics.quality.details.headingStats,
                        structuralElements: metrics.quality.details.structure
                    }
                },
                accuracy: {
                    score: metrics.quality.accuracyScore,
                    indicators: {
                        linkAnalysis: metrics.quality.details.links,
                        metadataPresence: metrics.quality.details.metadata
                    }
                },
                freshness: {
                    score: metrics.quality.freshnessScore
                }
            },
            metadata: {
                loadTime: `${loadTime}ms`,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error("Engagement/Quality analysis error:", error);
        return NextResponse.json(
            { error: "An error occurred while analyzing the website." },
            { status: 500 }
        );
    } finally {
        if (browser) await browser.close();
    }
}