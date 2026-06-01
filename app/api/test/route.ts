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

/**
 * Scrapes overview domain data from Similarweb.
 * Usage:
 * - /api/similarweb?domain=example.com
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    if (!query) {
        return NextResponse.json(
            { error: "Please provide a query via ?query=example.com" },
            { status: 400 }
        );
    }

    const domain = query
        .trim()
        .replace(/^https?:\/\//i, "")
        .replace(/\/+$/, "");

    let browser: any;
    try {
        const isVercel = !!process.env.VERCEL_ENV;
        let puppeteer: any;
        let launchOptions: any = {
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
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
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        );
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        });

        // Basic evasion script
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            // @ts-ignore
            window.chrome = { runtime: {} };
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        });

        // const targetUrl = `https://www.wordtracker.com/search?query=${encodeURIComponent(query)}`;
        const targetUrl = `https://semscoop.com/keyword-tool/?keyword=${encodeURIComponent(query)}&country=all&language=all`


        await page.goto(targetUrl, {
            waitUntil: "networkidle2",
            timeout: 60000,
        });

        // Wait to make sure the metrics load
        await new Promise(resolve => setTimeout(resolve, 8000));

        // Extract key metrics from the page text
        const metrics = await page.evaluate(() => {
            const fullText = document.body.innerText;

            console.log(fullText)
            return {
                rawTextSubset: fullText
            };
        });

        return NextResponse.json({
            domain,
            url: targetUrl,
            rawTextSubset: metrics.rawTextSubset,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error("Similarweb scraping error:", error);
        return NextResponse.json(
            { error: "An error occurred while fetching data from Similarweb.", details: error.message },
            { status: 500 }
        );
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}