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

function calculateUXScore(metrics: any) {
    let score = 100;

    // Performance (mostly based on load time and resource counts)
    if (metrics.performance < 70) score -= 15;
    if (metrics.performance < 50) score -= 10;

    // Mobile responsiveness
    if (metrics.mobileResponsive < 80) score -= 10;
    if (metrics.mobileResponsive < 50) score -= 15;

    // Accessibility
    if (metrics.accessibility < 80) score -= 10;
    if (metrics.accessibility < 50) score -= 10;

    // Ease of Use / Layout
    if (metrics.easeOfUse < 80) score -= 10;

    // Payload penalties
    if (metrics.htmlKB > 500) score -= 10;
    if (metrics.domNodes > 3000) score -= 10;

    return Math.max(0, score);
}

/**
 * API endpoint to get a UX performance score for a given URL.
 * Usage: /api/ux-performance?url=https://example.com
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

        // Set a desktop viewport
        await page.setViewport({ width: 1280, height: 800 });

        // Always scrape only the home page (origin)
        const targetUrl = parsedUrl.origin;

        // Navigation - wait for DOM content to be loaded at minimum
        await page.goto(targetUrl, {
            waitUntil: "domcontentloaded",
            timeout: 30000
        });

        // Small delay to let JS execution finish for dynamic sites
        await new Promise(resolve => setTimeout(resolve, 1500));

        const loadTime = Date.now() - startTime;

        // Extract high-fidelity metrics from the real DOM
        const data = await page.evaluate(() => {
            const getHTMLSize = () => document.documentElement.outerHTML.length / 1024;
            const getDOMNodes = () => document.querySelectorAll('*').length;
            const getScripts = () => document.querySelectorAll('script').length;
            const getStyles = () => document.querySelectorAll('link[rel="stylesheet"], style').length;
            const getImages = () => {
                const imgs = Array.from(document.querySelectorAll('img'));
                return {
                    total: imgs.length,
                    lazy: imgs.filter(i => i.getAttribute('loading') === 'lazy').length,
                    withAlt: imgs.filter(i => i.hasAttribute('alt') && i.getAttribute('alt') !== '').length
                };
            };

            const checkMobile = () => {
                let score = 0;
                if (document.querySelector('meta[name="viewport"]')) score += 40;
                if (Array.from(document.styleSheets).some(s => {
                    try { return Array.from(s.cssRules).some(r => (r as CSSMediaRule).media !== undefined); } catch (e) { return false; }
                })) score += 40;
                // Heuristic for responsive frameworks
                if (document.querySelector('.container, .row, .flex, .grid, [class*="mx-"], [class*="p-"]')) score += 20;
                return Math.min(100, score);
            };

            const checkAccessibility = () => {
                let score = 0;
                if (document.documentElement.lang) score += 20;
                if (document.title) score += 20;
                const imgs = getImages();
                if (imgs.total === 0 || imgs.withAlt / imgs.total > 0.8) score += 20;
                if (document.querySelector('header, footer, main, nav')) score += 20;
                if (document.querySelector('[aria-label], [role]')) score += 20;
                return score;
            };

            const checkEaseOfUse = () => {
                let score = 0;
                if (document.querySelector('nav')) score += 30;
                if (document.querySelector('h1')) score += 20;
                if (document.querySelector('input[type="search"], .search')) score += 20;
                if (document.querySelectorAll('a').length > 5) score += 30;
                return score;
            };

            return {
                htmlKB: getHTMLSize(),
                domNodes: getDOMNodes(),
                scripts: getScripts(),
                styles: getStyles(),
                images: getImages(),
                mobileResponsive: checkMobile(),
                accessibility: checkAccessibility(),
                easeOfUse: checkEaseOfUse()
            };
        });

        // Performance score calculation based on load time and complexity
        let performanceScore = 100;
        if (loadTime > 3000) performanceScore -= 30;
        else if (loadTime > 1500) performanceScore -= 15;
        if (data.htmlKB > 500) performanceScore -= 10;
        if (data.scripts > 30) performanceScore -= 10;
        performanceScore = Math.max(0, performanceScore);

        const metrics = {
            ...data,
            performance: performanceScore,
            loadTimeMs: loadTime
        };

        const uxScore = calculateUXScore(metrics);

        const breakdown = {
            overall: uxScore,
            categories: {
                performance: {
                    score: performanceScore,
                    details: {
                        loadTime: `${loadTime}ms`,
                        pageSize: `${data.htmlKB.toFixed(2)}KB`,
                        resources: `${data.scripts} scripts, ${data.styles} styles`
                    }
                },
                accessibility: {
                    score: data.accessibility,
                    details: {
                        imagesWithAlt: `${data.images.withAlt}/${data.images.total}`,
                        hasLang: !!(await page.evaluate(() => document.documentElement.lang))
                    }
                },
                mobile: {
                    score: data.mobileResponsive
                },
                usability: {
                    score: data.easeOfUse
                }
            }
        };

        return NextResponse.json({
            url: targetUrl,
            uxScore,
            metrics,
            breakdown,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("UX performance error:", error);
        return NextResponse.json(
            { error: "An error occurred while calculating UX performance." },
            { status: 500 }
        );
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}