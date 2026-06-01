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

        // Optimize: Block unnecessary resources
        await page.setRequestInterception(true);
        page.on('request', (req: any) => {
            if (['image', 'font', 'stylesheet'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        );

        const targetUrl = `https://backlinks.live/report/${encodeURIComponent(query)}`;

        await page.goto(targetUrl, {
            waitUntil: "domcontentloaded", // Faster than networkidle2
            timeout: 30000,
        });

        // Wait for the circle-text to be populated with a number
        try {
            await page.waitForFunction(() => {
                const el = document.querySelector('.circle-text');
                return el && el.textContent && /\d+\.\d+/.test(el.textContent);
            }, { timeout: 15000 });
        } catch (e) {
            console.log("Timed out waiting for numeric value, proceeding with best effort...");
        }

        // Extract key metrics
        const metrics = await page.evaluate(() => {
            const containers = Array.from(document.querySelectorAll('.circle-container'));
            return containers.map(container => {
                const valueDiv = container.querySelector('.circle-text');
                const labelDiv = container.querySelector('.circle-text-jos');

                const value = valueDiv ? (valueDiv as HTMLElement).innerText.trim() : 'N/A';
                const label = labelDiv ? (labelDiv as HTMLElement).innerText.trim().replace(/\s+/g, ' ') : 'N/A';

                return { label, value };
            });
        });

        return NextResponse.json({
            domain,
            metrics,
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