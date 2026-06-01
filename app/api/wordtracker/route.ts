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
 * API endpoint to scrape keyword data from Wordtracker.
 * Usage: /api/wordtracker?query=traffic%20boost
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    if (!query) {
        return NextResponse.json({ error: "Please provide a search query." }, { status: 400 });
    }

    // const targetUrl = `https://www.wordtracker.com/search?query=${encodeURIComponent(query)}`;

    const targetUrl = `https://www.keyword-tools.org/en/?keyword=${encodeURIComponent(query)}&searchengine=en&analysis=true`

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

        // Navigate to Wordtracker
        await page.goto(targetUrl, {
            waitUntil: "networkidle2",
            timeout: 60000
        });

        // Wait for potential results to load. Wordtracker uses a table or list.
        // We'll wait for a common element or a timeout if it's dynamic.
        try {
            await page.waitForSelector('table, .keywords-list, .results', { timeout: 10000 });
        } catch (e) {
            console.log("Results selector not found, attempting to scrape anyway...");
        }

        // Extract keyword data
        const results = await page.evaluate(() => {
            const data: any[] = [];
            console.log(document.querySelector)
            // Try to find the keyword table
            const table = document.querySelector('table');
            console.log(table)
            if (table) {
                const rows = Array.from(table.querySelectorAll('tr')).slice(1); // Skip header
                rows.forEach(row => {
                    const cols = Array.from(row.querySelectorAll('td'));
                    if (cols.length >= 2) {
                        data.push({
                            keyword: cols[0]?.innerText?.trim(),
                            volume: cols[1]?.innerText?.trim(),
                            iaat: cols[2]?.innerText?.trim() || 'N/A',
                            kei: cols[3]?.innerText?.trim() || 'N/A',
                            competition: cols[4]?.innerText?.trim() || 'N/A'
                        });
                    }
                });
            } else {
                // Fallback for non-table layouts (Wordtracker sometimes uses specialized lists)
                const keywordElements = document.querySelectorAll('.keyword, [data-keyword]');
                keywordElements.forEach((el: any) => {
                    data.push({
                        keyword: el.innerText?.trim(),
                        // Volume and other metrics might be siblings or child elements
                    });
                });
            }

            return data;
        });

        const loadTime = Date.now() - startTime;

        return NextResponse.json({
            query,
            url: targetUrl,
            results,
            count: results.length,
            metadata: {
                loadTime: `${loadTime}ms`,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error: any) {
        console.error("Wordtracker scraping error:", error);
        return NextResponse.json(
            { error: "An error occurred while scraping Wordtracker.", details: error.message },
            { status: 500 }
        );
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
