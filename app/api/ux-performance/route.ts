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
    let score = 0;

    // 1. Performance (25%)
    let perfScore = 100;
    if (metrics.loadTimeMs > 3000) perfScore -= 40;
    else if (metrics.loadTimeMs > 1500) perfScore -= 20;
    if (metrics.htmlKB > 800) perfScore -= 15;
    if (metrics.scripts > 50) perfScore -= 10;
    score += Math.max(0, perfScore) * 0.25;

    // 2. Mobile & Responsive (25%)
    score += metrics.mobileResponsive * 0.25;

    // 3. Accessibility & Semantics (20%)
    score += metrics.accessibility * 0.20;

    // 4. Usability & Layout (20%)
    score += metrics.easeOfUse * 0.20;

    // 5. Visual Stability & Richness (10%)
    score += metrics.visualRichness * 0.10;

    return Math.round(score);
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
                    withAlt: imgs.filter(i => i.hasAttribute('alt') && i.getAttribute('alt') !== '').length,
                    withDimensions: imgs.filter(i => i.hasAttribute('width') && i.hasAttribute('height')).length
                };
            };

            const checkMobile = () => {
                let score = 0;
                const hasViewport = !!document.querySelector('meta[name="viewport"]');
                if (hasViewport) score += 40;

                const hasMediaQueries = Array.from(document.styleSheets).some(s => {
                    try { return Array.from(s.cssRules).some(r => r.constructor.name === 'CSSMediaRule'); } catch (e) { return false; }
                });
                if (hasMediaQueries) score += 30;

                const hasResponsiveClass = !!document.querySelector('.container, .row, .flex, .grid, [class*="mx-"], [class*="p-"], [class*="md:"], [class*="lg:"]');
                if (hasResponsiveClass) score += 20;

                const touchTargets = Array.from(document.querySelectorAll('a, button, input[type="button"], input[type="submit"]'));
                const smallTargets = touchTargets.filter(t => {
                    const rect = t.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
                }).length;
                if (touchTargets.length > 0 && (smallTargets / touchTargets.length) < 0.2) score += 10;

                return {
                    score: Math.min(100, score),
                    details: { hasViewport, hasMediaQueries, hasResponsiveClass, smallTouchTargets: smallTargets }
                };
            };

            const checkAccessibility = () => {
                let score = 0;
                const hasLang = !!document.documentElement.lang;
                if (hasLang) score += 20;

                const hasTitle = !!document.title;
                if (hasTitle) score += 20;

                const imgs = getImages();
                const altRatio = imgs.total === 0 ? 1 : imgs.withAlt / imgs.total;
                if (altRatio > 0.8) score += 20;

                const semanticTags = document.querySelectorAll('header, footer, main, nav, section, article, aside').length;
                if (semanticTags >= 4) score += 20;

                const ariaElements = document.querySelectorAll('[aria-label], [role], [aria-hidden], [aria-expanded]').length;
                if (ariaElements > 0) score += 20;

                return {
                    score: Math.min(100, score),
                    details: { hasLang, hasTitle, altRatio, semanticTags, ariaElements }
                };
            };

            const checkEaseOfUse = () => {
                let score = 0;
                const hasNav = !!document.querySelector('nav, [role="navigation"], .nav, .menu');
                if (hasNav) score += 25;

                const hasH1 = !!document.querySelector('h1');
                if (hasH1) score += 20;

                const hasSearch = !!document.querySelector('input[type="search"], .search, #search');
                if (hasSearch) score += 15;

                const linkCount = document.querySelectorAll('a').length;
                if (linkCount > 5) score += 20;

                const listCount = document.querySelectorAll('ul, ol').length;
                if (listCount > 0) score += 20;

                return {
                    score: Math.min(100, score),
                    details: { hasNav, hasH1, hasSearch, linkCount, listCount }
                };
            };

            const checkVisualRichness = () => {
                let score = 0;
                const hasAnimations = Array.from(document.styleSheets).some(s => {
                    try { return Array.from(s.cssRules).some(r => r.constructor.name === 'CSSKeyframesRule'); } catch (e) { return false; }
                });
                if (hasAnimations) score += 30;

                const videoCount = document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length;
                if (videoCount > 0) score += 25;

                const customFonts = Array.from(document.styleSheets).some(s => {
                    try { return Array.from(s.cssRules).some(r => r.constructor.name === 'CSSFontFaceRule'); } catch (e) { return false; }
                });
                if (customFonts) score += 25;

                const svgCount = document.querySelectorAll('svg').length;
                if (svgCount > 5) score += 20;

                return {
                    score: Math.min(100, score),
                    details: { hasAnimations, videoCount, customFonts, svgCount }
                };
            };

            return {
                htmlKB: getHTMLSize(),
                domNodes: getDOMNodes(),
                scripts: getScripts(),
                styles: getStyles(),
                images: getImages(),
                mobile: checkMobile(),
                accessibility: checkAccessibility(),
                easeOfUse: checkEaseOfUse(),
                visual: checkVisualRichness()
            };
        });

        const metrics = {
            ...data,
            performance: data.htmlKB > 800 ? 50 : 100, // Placeholder for score calc
            loadTimeMs: loadTime,
            mobileResponsive: data.mobile.score,
            accessibility: data.accessibility.score,
            easeOfUse: data.easeOfUse.score,
            visualRichness: data.visual.score
        };

        const uxScore = calculateUXScore(metrics);

        const breakdown = {
            overall: uxScore,
            categories: {
                performance: {
                    score: metrics.performance, // Will be adjusted by loadTime in overall
                    details: {
                        loadTime: `${loadTime}ms`,
                        pageSize: `${data.htmlKB.toFixed(2)}KB`,
                        resources: {
                            scripts: data.scripts,
                            styles: data.styles,
                            domNodes: data.domNodes
                        }
                    }
                },
                accessibility: {
                    score: data.accessibility.score,
                    details: data.accessibility.details
                },
                mobile: {
                    score: data.mobile.score,
                    details: data.mobile.details
                },
                usability: {
                    score: data.easeOfUse.score,
                    details: data.easeOfUse.details
                },
                visual: {
                    score: data.visual.score,
                    details: data.visual.details
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