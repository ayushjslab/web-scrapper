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
 * API endpoint to scrape detailed content information from a URL.
 * Usage: GET /api/easerank?url=https://example.com
 *
 * Returns: title, meta title, meta description, category, tags, intro,
 *          all headings, full cleaned content, faq, conclusion,
 *          internal links, cta sections, image alt texts, publish date
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
        const isVercel = !!process.env.VERCEL_ENV;
        let puppeteer: any,
            launchOptions: any = {
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

        await page.goto(parsedUrl.toString(), {
            waitUntil: "load",
            timeout: 60000,
        });

        // Allow JS hydration to complete
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const data = await page.evaluate((hostname: string) => {
            // ── Helpers ───────────────────────────────────────────────────────────

            const getMeta = (selector: string): string => {
                const el = document.querySelector(selector);
                return (el as HTMLMetaElement)?.content?.trim() ?? "";
            };

            const cleanText = (text: string): string =>
                text.replace(/\s+/g, " ").trim();

            // Determine the main article/content container
            const getContentEl = (): Element => {
                const candidates = [
                    "article",
                    "main",
                    '[role="main"]',
                    ".post-content",
                    ".entry-content",
                    ".article-content",
                    ".article-body",
                    ".blog-content",
                    ".content-body",
                    "#content",
                    ".content",
                ];
                for (const sel of candidates) {
                    const el = document.querySelector(sel);
                    if (el) return el;
                }
                return document.body;
            };

            const contentEl = getContentEl();

            // ── Title ─────────────────────────────────────────────────────────────
            const title =
                document.querySelector("h1")?.innerText?.trim() ||
                (document.querySelector("title") as HTMLTitleElement)?.text?.trim() ||
                "";

            // ── Meta Title ────────────────────────────────────────────────────────
            const metaTitle =
                getMeta('meta[property="og:title"]') ||
                getMeta('meta[name="twitter:title"]') ||
                (document.querySelector("title") as HTMLTitleElement)?.text?.trim() ||
                "";

            // ── Meta Description ──────────────────────────────────────────────────
            const metaDescription =
                getMeta('meta[name="description"]') ||
                getMeta('meta[property="og:description"]') ||
                getMeta('meta[name="twitter:description"]') ||
                "";

            // ── All Headings ──────────────────────────────────────────────────────
            const allHeadingEls = Array.from(
                contentEl.querySelectorAll("h1, h2, h3, h4, h5, h6")
            );
            const headings = allHeadingEls.map((h) => ({
                level: h.tagName.toLowerCase(),
                text: cleanText((h as HTMLElement).innerText),
            }));

            // ── Intro (first non-empty paragraph inside content) ──────────────────
            const allParas = Array.from(contentEl.querySelectorAll("p"));
            const introPara = allParas.find(
                (p) => (p as HTMLElement).innerText?.trim().length > 40
            );
            const intro = introPara
                ? cleanText((introPara as HTMLElement).innerText)
                : "";


            // ── FAQ ───────────────────────────────────────────────────────────────
            const faqItems: { question: string; answer: string }[] = [];

            // Strip HTML tags (JSON-LD answers often contain markup)
            const stripHtml = (html: string) =>
                html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

            // 1. JSON-LD FAQPage schema
            const jsonLdScripts = Array.from(
                document.querySelectorAll('script[type="application/ld+json"]')
            );
            for (const script of jsonLdScripts) {
                try {
                    const json = JSON.parse(script.textContent || "");
                    const candidates = Array.isArray(json)
                        ? json
                        : [json, ...(json["@graph"] ?? [])];
                    for (const node of candidates) {
                        if (node["@type"] === "FAQPage" && Array.isArray(node.mainEntity)) {
                            for (const q of node.mainEntity) {
                                const answer = q.acceptedAnswer?.text || q.acceptedAnswer?.["@value"] || "";
                                faqItems.push({
                                    question: cleanText(stripHtml(q.name || "")),
                                    answer: cleanText(stripHtml(answer)),
                                });
                            }
                        }
                    }
                } catch { }
            }

            // 2. Native <details>/<summary> pattern
            if (faqItems.length === 0) {
                const detailsEls = Array.from(
                    document.querySelectorAll("details")
                );

                const isValidQuestion = (text: string) => {
                    const lower = text.toLowerCase();

                    return (
                        text.endsWith("?") ||
                        lower.startsWith("what") ||
                        lower.startsWith("how") ||
                        lower.startsWith("why") ||
                        lower.startsWith("when") ||
                        lower.startsWith("where") ||
                        lower.startsWith("can") ||
                        lower.startsWith("do") ||
                        lower.startsWith("does") ||
                        lower.startsWith("is") ||
                        lower.startsWith("are") ||
                        lower.startsWith("will")
                    );
                };

                for (const det of detailsEls) {
                    const summary =
                        det.querySelector("summary");

                    if (!summary) continue;

                    const question = cleanText(
                        (summary as HTMLElement).innerText || ""
                    );

                    if (
                        !question ||
                        question.length < 5 ||
                        question.length > 250 ||
                        !isValidQuestion(question)
                    ) {
                        continue;
                    }

                    // Remove summary from cloned node
                    const cloned =
                        det.cloneNode(true) as HTMLElement;

                    const clonedSummary =
                        cloned.querySelector("summary");

                    if (clonedSummary) {
                        clonedSummary.remove();
                    }

                    const answer = cleanText(
                        cloned.innerText || ""
                    );

                    if (
                        answer &&
                        answer !== question &&
                        answer.length > 20 &&
                        answer.length < 3000 &&
                        !faqItems.some(
                            (f) =>
                                f.question.toLowerCase() ===
                                question.toLowerCase()
                        )
                    ) {
                        faqItems.push({
                            question,
                            answer,
                        });
                    }
                }
            }

            // 3. <dt>/<dd> definition list pattern
            if (faqItems.length === 0) {
                const dts = Array.from(
                    document.querySelectorAll("dt")
                );

                const isValidQuestion = (text: string) => {
                    const lower = text.toLowerCase();

                    return (
                        text.endsWith("?") ||
                        lower.startsWith("what") ||
                        lower.startsWith("how") ||
                        lower.startsWith("why") ||
                        lower.startsWith("when") ||
                        lower.startsWith("where") ||
                        lower.startsWith("can") ||
                        lower.startsWith("do") ||
                        lower.startsWith("does") ||
                        lower.startsWith("is") ||
                        lower.startsWith("are") ||
                        lower.startsWith("will")
                    );
                };

                for (const dt of dts) {
                    const dd = dt.nextElementSibling;

                    if (!dd || dd.tagName !== "DD") {
                        continue;
                    }

                    const question = cleanText(
                        (dt as HTMLElement).innerText || ""
                    );

                    const answer = cleanText(
                        (dd as HTMLElement).innerText || ""
                    );

                    if (
                        !question ||
                        !answer ||
                        question.length < 5 ||
                        question.length > 250 ||
                        answer.length < 20 ||
                        answer.length > 3000 ||
                        !isValidQuestion(question)
                    ) {
                        continue;
                    }

                    // Avoid duplicates
                    if (
                        faqItems.some(
                            (f) =>
                                f.question.toLowerCase() ===
                                question.toLowerCase()
                        )
                    ) {
                        continue;
                    }

                    faqItems.push({
                        question,
                        answer,
                    });
                }
            }

            // 4. Broad DOM heuristic — find FAQ/accordion containers and pair siblings
            if (faqItems.length === 0) {
                const faqContainerSel = [
                    '[class*="faq"]',
                    '[id*="faq"]',
                    '[class*="accordion"]',
                    '[id*="accordion"]',
                ].join(",");

                const faqContainers = Array.from(
                    document.querySelectorAll(faqContainerSel)
                );

                const searchRoots: Element[] =
                    faqContainers.length > 0
                        ? faqContainers
                        : [document.body];

                const isValidQuestion = (text: string) => {
                    const lower = text.toLowerCase();

                    return (
                        text.endsWith("?") ||
                        lower.startsWith("what") ||
                        lower.startsWith("how") ||
                        lower.startsWith("why") ||
                        lower.startsWith("when") ||
                        lower.startsWith("where") ||
                        lower.startsWith("can") ||
                        lower.startsWith("do") ||
                        lower.startsWith("does") ||
                        lower.startsWith("is") ||
                        lower.startsWith("are")
                    );
                };

                for (const root of searchRoots) {
                    const questionEls = Array.from(
                        root.querySelectorAll(
                            `
        h2,
        h3,
        h4,
        button,
        [class*="question"],
        [class*="Question"]
      `
                        )
                    ).filter((el) => {
                        const text = cleanText(
                            (el as HTMLElement).innerText || ""
                        );

                        return (
                            text &&
                            text.length > 8 &&
                            text.length < 200 &&
                            isValidQuestion(text)
                        );
                    });

                    for (const qEl of questionEls) {
                        const qText = cleanText(
                            (qEl as HTMLElement).innerText
                        );

                        if (
                            faqItems.some(
                                (f) => f.question === qText
                            )
                        ) {
                            continue;
                        }

                        let answerText = "";

                        // Next sibling
                        const nextSib = qEl.nextElementSibling;

                        if (nextSib) {
                            answerText = cleanText(
                                (nextSib as HTMLElement).innerText || ""
                            );
                        }

                        // Parent next sibling
                        if (!answerText && qEl.parentElement) {
                            const parentNext =
                                qEl.parentElement.nextElementSibling;

                            if (parentNext) {
                                answerText = cleanText(
                                    (parentNext as HTMLElement).innerText || ""
                                );
                            }
                        }

                        // Validation
                        if (
                            answerText &&
                            answerText !== qText &&
                            answerText.length > 20 &&
                            answerText.length < 1500
                        ) {
                            faqItems.push({
                                question: qText,
                                answer: answerText,
                            });
                        }
                    }

                    if (faqItems.length > 0) break;
                }
            }


            // ── Internal Links ────────────────────────────────────────────────────
            const internalLinks = Array.from(
                document.querySelectorAll("a[href]")
            )
                .map((a) => ({
                    text: cleanText((a as HTMLElement).innerText),
                    href: (a as HTMLAnchorElement).href,
                }))
                .filter(
                    (link) =>
                        link.href.includes(hostname) &&
                        link.text.length > 0 &&
                        !link.href.includes("#")
                )
                .reduce((acc: { text: string; href: string }[], cur) => {
                    if (!acc.some((l) => l.href === cur.href)) acc.push(cur);
                    return acc;
                }, []);


            // ── Logo URL ────────────────────────────────────────────────────────
            const logoSelectors = [
                'meta[property="og:logo"]',
                'meta[itemprop="logo"]',
                'link[rel="apple-touch-icon"]',
                'link[rel="icon"][sizes="192x192"]',
                'link[rel="icon"]',
                'link[rel="shortcut icon"]',
            ];

            let logoUrl = "";

            // Try to find Logo in JSON-LD first (Organization or Website schema)
            const scriptsForLogo = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
            for (const script of scriptsForLogo) {
                try {
                    const json = JSON.parse(script.textContent || "");
                    const candidates = Array.isArray(json) ? json : [json, ...(json["@graph"] ?? [])];
                    for (const node of candidates) {
                        if (node.logo) {
                            logoUrl = typeof node.logo === "string" ? node.logo : node.logo.url;
                            if (logoUrl) break;
                        }
                        if (node.publisher && node.publisher.logo && node.publisher.logo.url) {
                            logoUrl = node.publisher.logo.url;
                            if (logoUrl) break;
                        }
                    }
                    if (logoUrl) break;
                } catch { }
            }

            // Fallback to meta / link tags
            if (!logoUrl) {
                for (const selector of logoSelectors) {
                    const el = document.querySelector(selector);
                    if (el) {
                        logoUrl = (el as HTMLMetaElement).content || (el as HTMLLinkElement).href;
                        if (logoUrl) break;
                    }
                }
            }

            // Finally, attempt to find an img tag that looks like a logo
            if (!logoUrl) {
                const imgLogo = document.querySelector('img[src*="logo"], img[alt*="logo" i]') as HTMLImageElement;
                if (imgLogo) {
                    logoUrl = imgLogo.src;
                }
            }

            return {
                title,
                metaTitle,
                metaDescription,
                intro,
                headings,
                faq: faqItems,
                internalLinks,
                logoUrl,
            };
        }, parsedUrl.hostname);

        return NextResponse.json({
            url: parsedUrl.toString(),
            scrapedAt: new Date().toISOString(),
            ...data,
        });
    } catch (error) {
        console.error("EaseRank scrape error:", error);
        return NextResponse.json(
            { error: "An error occurred while scraping the website." },
            { status: 500 }
        );
    } finally {
        if (browser) await browser.close();
    }
}