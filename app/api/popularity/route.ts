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
 * Estimate Traffic & Popularity from HTML and domain analysis
 * Note: Actual traffic data requires analytics access or paid APIs.
 * We estimate based on indicators and can integrate with free APIs where available.
 */
async function evaluateTrafficAndPopularity(htmlContent: string, textContent: string, domain: string) {
    let monthlyActiveUsersIndicators = 0;
    let globalRankingIndicators = 0;
    let marketShareIndicators = 0;

    // === MONTHLY ACTIVE USERS INDICATORS ===

    // Social media follower counts (if displayed on site)
    const followerPatterns = [
        /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:K|M|B)?\s*followers?/gi,
        /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:K|M|B)?\s*subscribers?/gi,
        /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:K|M|B)?\s*members?/gi
    ];

    let maxFollowers = 0;
    followerPatterns.forEach(pattern => {
        const matches = textContent.match(pattern);
        if (matches) {
            matches.forEach(match => {
                const numMatch = match.match(/(\d+(?:,\d+)*(?:\.\d+)?)\s*([KMB])?/i);
                if (numMatch) {
                    let num = parseFloat(numMatch[1].replace(/,/g, ''));
                    const multiplier = numMatch[2];
                    if (multiplier === 'K') num *= 1000;
                    if (multiplier === 'M') num *= 1000000;
                    if (multiplier === 'B') num *= 1000000000;
                    maxFollowers = Math.max(maxFollowers, num);
                }
            });
        }
    });

    if (maxFollowers > 10000000) monthlyActiveUsersIndicators += 30;
    else if (maxFollowers > 1000000) monthlyActiveUsersIndicators += 25;
    else if (maxFollowers > 100000) monthlyActiveUsersIndicators += 20;
    else if (maxFollowers > 10000) monthlyActiveUsersIndicators += 15;
    else if (maxFollowers > 1000) monthlyActiveUsersIndicators += 10;

    // User/member count displays
    const userCountMatch = textContent.match(/(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:K|M|B)?\s*(?:users?|customers?|members?)/gi);
    if (userCountMatch && userCountMatch.length > 0) {
        monthlyActiveUsersIndicators += 15;
    }

    // Active community indicators
    const hasActiveComments = /\d+\s*comments?/gi.test(textContent);
    const hasForums = /forum|community|discussion board/i.test(textContent);
    if (hasActiveComments) monthlyActiveUsersIndicators += 10;
    if (hasForums) monthlyActiveUsersIndicators += 10;

    // Social proof elements
    const hasReviews = /(\d+(?:,\d+)*)\s*reviews?/gi.test(textContent);
    const hasTestimonials = /testimonial|customer stories/i.test(textContent);
    if (hasReviews) monthlyActiveUsersIndicators += 10;
    if (hasTestimonials) monthlyActiveUsersIndicators += 5;

    // App download numbers
    const appDownloads = textContent.match(/(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:K|M|B)?\s*(?:downloads?|installs?)/gi);
    if (appDownloads) monthlyActiveUsersIndicators += 15;

    // === GLOBAL RANKING INDICATORS ===

    // Domain age/authority indicators
    const hasPressPage = /press|media|news room/i.test(htmlContent);
    if (hasPressPage) globalRankingIndicators += 15;

    // Multiple language support (global reach)
    const languageCount = (htmlContent.match(/<html[^>]+lang=/gi) || []).length;
    const hasLanguageSwitcher = /language|español|français|deutsch|中文|日本語|한국어/i.test(htmlContent);
    if (hasLanguageSwitcher || languageCount > 1) globalRankingIndicators += 20;

    // International presence
    const hasInternationalLinks = /\.co\.uk|\.de|\.fr|\.jp|\.cn|\.in|\.au|\.ca/i.test(htmlContent);
    if (hasInternationalLinks) globalRankingIndicators += 10;

    // Major brand partnerships
    const hasPartners = /partners?|clients?|trusted by/i.test(htmlContent);
    const hasFortune500 = /google|microsoft|amazon|apple|facebook|meta|netflix|spotify|uber|airbnb/i.test(htmlContent);
    if (hasPartners) globalRankingIndicators += 10;
    if (hasFortune500) globalRankingIndicators += 15;

    // Awards/recognition
    const hasAwards = /award|winner|best of|top \d+|recognized by/i.test(htmlContent);
    if (hasAwards) globalRankingIndicators += 15;

    // Media mentions
    const mediaMentions = /forbes|techcrunch|wired|cnn|bbc|nyt|wall street journal|washington post/i.test(htmlContent);
    if (mediaMentions) globalRankingIndicators += 15;

    // === MARKET SHARE INDICATORS ===

    // Industry leadership claims
    const leadershipClaims = /leading|#1|number one|market leader|industry leader|largest/i.test(textContent);
    if (leadershipClaims) marketShareIndicators += 20;

    // Statistics/metrics displayed
    const statsPattern = /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:%|percent|million|billion|trillion)/gi;
    const statsCount = (textContent.match(statsPattern) || []).length;
    if (statsCount > 10) marketShareIndicators += 20;
    else if (statsCount > 5) marketShareIndicators += 15;
    else if (statsCount > 2) marketShareIndicators += 10;

    // Enterprise/B2B indicators
    const hasEnterprise = /enterprise|b2b|business solutions?|for teams?/i.test(textContent);
    if (hasEnterprise) marketShareIndicators += 15;

    // Case studies/success stories
    const hasCaseStudies = /case study|case studies|success stories|customer stories/i.test(textContent);
    if (hasCaseStudies) marketShareIndicators += 15;

    // Product/service diversity
    const productCount = (textContent.match(/product|service|solution|feature/gi) || []).length;
    if (productCount > 50) marketShareIndicators += 15;
    else if (productCount > 20) marketShareIndicators += 10;

    // API/Developer platform (ecosystem)
    const hasDeveloperPlatform = /api|developers?|sdk|integration/i.test(textContent);
    if (hasDeveloperPlatform) marketShareIndicators += 15;

    return {
        monthlyActiveUsersScore: Math.min(100, monthlyActiveUsersIndicators),
        globalRankingScore: Math.min(100, globalRankingIndicators),
        marketShareScore: Math.min(100, marketShareIndicators),
        details: {
            estimatedFollowers: maxFollowers,
            hasUserCountDisplay: !!userCountMatch,
            hasActiveComments,
            hasForums,
            hasReviews,
            hasTestimonials,
            hasAppDownloads: !!appDownloads,
            hasPressPage,
            languageCount,
            hasLanguageSwitcher,
            hasInternationalPresence: hasInternationalLinks,
            hasPartners,
            hasFortune500,
            hasAwards,
            hasMediaMentions: mediaMentions,
            leadershipClaims,
            statsCount,
            hasEnterprise,
            hasCaseStudies,
            productCount,
            hasDeveloperPlatform
        }
    };
}

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Evaluate Brand Recognition & Trust from HTML
 */
async function evaluateBrandTrust(
    htmlContent: string,
    textContent: string,
    domain: string,
    url: string
) {
    let brandRecognition = 0;
    let userTrust = 0;
    let yearsInOperation = 0;

    const currentYear = new Date().getFullYear();

    // === NORMALIZE (SAFE) ===
    const normalizedHTML = htmlContent
        .toLowerCase()
        .replace(/\s+/g, ' ');

    const normalizedText = textContent
        .toLowerCase()
        .replace(/\s+/g, ' ');

    // === BRAND RECOGNITION ===

    const tld = domain.split('.').pop();
    if (tld === 'com') brandRecognition += 8;
    else if (tld === 'org' || tld === 'net') brandRecognition += 5;

    const brandNameRaw = domain.replace(/^www\./, '').split('.')[0];
    const brandName = brandNameRaw.replace(/[-_]/g, ' ');
    const safeBrandRegex = new RegExp(`\\b${escapeRegex(brandName)}\\b`, 'gi');

    if (brandName.length <= 6) brandRecognition += 10;
    else if (brandName.length <= 10) brandRecognition += 5;
    const socialSignals = {
        high: [
            /linkedin\.com\/company\//,
            /crunchbase\.com\//,
            /github\.com\//,
            /producthunt\.com\//
        ],
        medium: [
            /twitter\.com\/|x\.com\//,
            /youtube\.com\//,
            /medium\.com\//,
            /dev\.to\//,
            /hashnode\.com\//
        ],
        low: [
            /facebook\.com\//,
            /instagram\.com\//,
            /tiktok\.com\//,
            /pinterest\.com\//,
            /reddit\.com\//,
            /discord\.gg\//,
            /discord\.com\/invite\//,
            /telegram\.me\//,
            /t\.me\//,
            /vk\.com\//,
            /wechat\.com\//
        ]
    };


    let socialScore = 0;

    socialSignals.high.forEach(p => {
        if (p.test(normalizedHTML)) socialScore += 4;
    });

    socialSignals.medium.forEach(p => {
        if (p.test(normalizedHTML)) socialScore += 2;
    });

    socialSignals.low.forEach(p => {
        if (p.test(normalizedHTML)) socialScore += 1;
    });

    // Hard cap to avoid inflation
    brandRecognition += Math.min(15, socialScore);

    const socialCount =
        Object.values(socialSignals)
            .flat()
            .filter(p => p.test(normalizedHTML)).length;


    if (/wikipedia\.org/.test(normalizedHTML)) brandRecognition += 15;
    if (/(press|newsroom|media kit)/.test(normalizedHTML)) brandRecognition += 8;

    const brandMentionCount =
        (normalizedText.match(safeBrandRegex) || []).length;
    if (brandMentionCount >= 5) brandRecognition += 8;

    if (/partners?|collaborations?|sponsors?/.test(normalizedText))
        brandRecognition += 6;

    if (/app store|google play|download.*app/.test(normalizedText))
        brandRecognition += 8;

    if (/locations?|stores?|offices?|find us/.test(normalizedText))
        brandRecognition += 8;

    // === USER TRUST ===

    const isHTTPS = url.startsWith('https://');
    if (isHTTPS) userTrust += 8;

    const hasSecurityBadges =
        /(mcafee|norton|trustwave|sectigo|cloudflare)/.test(normalizedHTML);
    if (hasSecurityBadges) userTrust += 8;

    // --- Privacy Policy ---
    const hasPrivacy =
        /(privacy policy|privacy notice|privacy statement)/.test(normalizedText) ||
        /href=["'][^"']*(privacy|privacy-policy|gdpr|data-protection)[^"']*["']/.test(normalizedHTML);

    if (hasPrivacy) userTrust += 10;

    // --- Terms ---
    const hasTerms =
        /(terms of service|terms and conditions|terms of use)/.test(normalizedText) ||
        /href=["'][^"']*(terms|conditions|legal)[^"']*["']/.test(normalizedHTML);

    if (hasTerms) userTrust += 10;

    // --- Contact Info ---
    const hasEmail =
        /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/.test(normalizedText);

    const hasPhone =
        /\+?\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,5}[\s.-]?\d{4}/.test(normalizedText);

    const hasAddress =
        /(address|headquarters|hq|registered office)/.test(normalizedText);

    if (hasEmail) userTrust += 4;
    if (hasPhone) userTrust += 4;
    if (hasAddress) userTrust += 4;

    const hasCustomerSupport =
        /(support|help center|customer service|faq|contact us)/.test(normalizedText);

    if (hasCustomerSupport) userTrust += 8;

    // --- Reviews ---
    const ratingMatch =
        normalizedText.match(
            /(★{3,5}|[1-5](?:\.\d)?\s*(?:\/\s*5|out of 5|stars?)|rated\s*[1-5](?:\.\d)?)/i
        );


    const hasReviewPlatforms =
        /(trustpilot\.com|g2\.com|capterra\.com|yelp\.com|bbb\.org)/i.test(normalizedHTML) ||
        /\b(trustpilot|g2|capterra|yelp|better business bureau|bbb)\b/i.test(normalizedText) ||
        /(rated on|reviews on|reviewed on|rating on)\s+(google|g2|capterra|trustpilot|yelp)/i.test(normalizedText);

    const hasGoogleReviews =
        /(4\.\d|5\.0)\s*(★|stars?)/i.test(normalizedText) &&
        /(google|maps)/i.test(normalizedText);

    const hasExternalReviewPlatform = hasReviewPlatforms;
    const hasAnyRating = !!ratingMatch;
    const hasVerifiedReviews = hasExternalReviewPlatform || hasGoogleReviews;


    if (hasAnyRating && hasVerifiedReviews) {
        userTrust += 10;
    }

    if (/refund policy|money back|warranty|guarantee/.test(normalizedText))
        userTrust += 5;

    // --- CERTIFICATIONS (STRICT) ---
    const hasISO =
        /iso\s*(9001|14001|27001|22301|27701)/.test(normalizedText) ||
        /iso\/iec\s*(27001|27701)/.test(normalizedText);

    const hasCertAuthority =
        /(certified by|accredited by)\s+(tuv|ukas|bsi|sgs|dnv|ansi|ias)/.test(normalizedText);

    const hasCertLink =
        /href=["'][^"']*(certificate|certification|accreditation|iso)[^"']*["']/.test(normalizedHTML);

    const fakeCertContext =
        /(certified developer|open source license|licensed under)/.test(normalizedText);

    const hasCertifications =
        !fakeCertContext && (hasISO || hasCertAuthority || hasCertLink);

    if (hasCertifications) userTrust += hasISO ? 8 : 5;

    if (/(about us|our story|who we are|our team)/.test(normalizedText))
        userTrust += 5;

    if (!hasPrivacy && !hasTerms) userTrust -= 8;

    // === YEARS IN OPERATION ===

    let foundedYear = 0;

    const yearMatches = normalizedText.match(/\b(19\d{2}|20\d{2})\b/g) || [];
    yearMatches.forEach(y => {
        const year = parseInt(y);
        if (year > 1990 && year < currentYear) {
            if (!foundedYear || year < foundedYear) foundedYear = year;
        }
    });

    const yearsActive = foundedYear ? currentYear - foundedYear : 0;

    if (yearsActive > 20) yearsInOperation = 100;
    else if (yearsActive > 10) yearsInOperation = 85;
    else if (yearsActive > 5) yearsInOperation = 65;
    else if (yearsActive > 3) yearsInOperation = 45;
    else if (yearsActive > 1) yearsInOperation = 25;
    else yearsInOperation = 20;

    if (/(timeline|history|milestones|journey)/.test(normalizedHTML))
        yearsInOperation = Math.min(100, yearsInOperation + 10);

    return {
        brandRecognitionScore: Math.min(100, brandRecognition),
        userTrustScore: Math.min(100, Math.max(0, userTrust)),
        yearsInOperationScore: yearsInOperation,
        details: {
            isHTTPS,
            isTldCom: tld === 'com',
            brandNameLength: brandName.length,
            socialScore,
            socialMediaCount: socialCount,
            hasWikipedia: /wikipedia\.org/.test(normalizedHTML),
            hasPressPage: /(press|newsroom|media kit)/.test(normalizedHTML),
            brandMentionCount,
            hasPartners: /partners?|collaborations?|sponsors?/.test(normalizedText),
            hasAppStore: /app store|google play|download.*app/.test(normalizedText),
            hasPhysicalLocation: /locations?|stores?|offices?|find us/.test(normalizedText),
            hasSecurityBadges,
            hasPrivacyPolicy: hasPrivacy,
            hasTermsOfService: hasTerms,
            hasEmail,
            hasPhone,
            hasAddress,
            hasCustomerSupport,
            hasReviews: hasAnyRating,
            hasGoogleReviews,
            hasExternalReviewPlatform,
            hasAnyRating,
            hasVerifiedReviews,
            foundedYear: foundedYear || 'Unknown',
            estimatedYearsActive: yearsActive || 'Unknown',
            hasCertifications
        }
    };
}



/**
 * Try to get Tranco ranking (free alternative to Alexa)
 * Tranco provides free top 1M website rankings
 */
async function getTrancoRank(domain: string): Promise<number | null> {
    try {
        // Note: This is a simplified example. In production, you'd want to:
        // 1. Download and cache the Tranco list
        // 2. Query it locally
        // For now, we'll just return null as this requires external data
        return null;
    } catch (error) {
        return null;
    }
}

function calculateOverallScore(traffic: any, brand: any) {
    const trafficWeight = 0.5;
    const brandWeight = 0.5;

    const trafficAvg = (
        traffic.monthlyActiveUsersScore +
        traffic.globalRankingScore +
        traffic.marketShareScore
    ) / 3;

    const brandAvg = (
        brand.brandRecognitionScore +
        brand.userTrustScore +
        brand.yearsInOperationScore
    ) / 3;

    return Math.round(
        (trafficAvg * trafficWeight) +
        (brandAvg * brandWeight)
    );
}

/**
 * API endpoint to evaluate traffic/popularity and brand trust.
 * Usage: /api/traffic-brand?url=https://example.com
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const urlParam = searchParams.get("url");

    if (!urlParam) {
        return NextResponse.json(
            { error: "Please provide a URL." },
            { status: 400 }
        );
    }

    let inputUrl = urlParam.trim();
    if (!/^https?:\/\//i.test(inputUrl)) {
        inputUrl = `https://${inputUrl}`;
    }

    let parsedUrl: URL;
    try {
        parsedUrl = new URL(inputUrl);
    } catch {
        return NextResponse.json(
            { error: "Invalid URL provided." },
            { status: 400 }
        );
    }

    const domain = parsedUrl.hostname.replace(/^www\./, '');

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

        // Navigation
        await page.goto(parsedUrl.toString(), {
            waitUntil: "load",
            timeout: 60000
        });

        // Delay for dynamic content
        await new Promise(resolve => setTimeout(resolve, 3000));

        const htmlContent = await page.content();
        const textContent = await page.evaluate(() => document.body.innerText);
        const fetchTime = Date.now() - startTime;

        // Evaluate traffic and brand metrics
        // We pass textContent as well for better analysis where needed
        const traffic = await evaluateTrafficAndPopularity(htmlContent, textContent, domain);
        const brand = await evaluateBrandTrust(htmlContent, textContent, domain, parsedUrl.toString());
        const overallScore = calculateOverallScore(traffic, brand);

        // Try to get external ranking data
        const trancoRank = await getTrancoRank(domain);

        return NextResponse.json({
            url: parsedUrl.toString(),
            domain,
            overallScore,
            trafficAndPopularity: {
                monthlyActiveUsers: {
                    score: traffic.monthlyActiveUsersScore,
                    indicators: {
                        estimatedFollowers: traffic.details.estimatedFollowers,
                        hasUserCountDisplay: traffic.details.hasUserCountDisplay,
                        hasActiveComments: traffic.details.hasActiveComments,
                        hasForums: traffic.details.hasForums,
                        hasReviews: traffic.details.hasReviews,
                        hasTestimonials: traffic.details.hasTestimonials,
                        hasAppDownloads: traffic.details.hasAppDownloads
                    }
                },
                globalRanking: {
                    score: traffic.globalRankingScore,
                    indicators: {
                        hasPressPage: traffic.details.hasPressPage,
                        languageCount: traffic.details.languageCount,
                        hasLanguageSwitcher: traffic.details.hasLanguageSwitcher,
                        hasInternationalPresence: traffic.details.hasInternationalPresence,
                        hasPartners: traffic.details.hasPartners,
                        hasFortune500: traffic.details.hasFortune500,
                        hasMediaMentions: traffic.details.hasMediaMentions,
                        hasAwards: traffic.details.hasAwards,
                        trancoRank: trancoRank || 'Not available'
                    }
                },
                marketShare: {
                    score: traffic.marketShareScore,
                    indicators: {
                        leadershipClaims: traffic.details.leadershipClaims,
                        statsCount: traffic.details.statsCount,
                        hasEnterprise: traffic.details.hasEnterprise,
                        hasCaseStudies: traffic.details.hasCaseStudies,
                        productCount: traffic.details.productCount,
                        hasDeveloperPlatform: traffic.details.hasDeveloperPlatform
                    }
                }
            },
            brandRecognitionAndTrust: {
                brandRecognition: {
                    score: brand.brandRecognitionScore,
                    indicators: {
                        isTldCom: brand.details.isTldCom,
                        brandNameLength: brand.details.brandNameLength,
                        socialScore: brand.details.socialScore,
                        socialMediaCount: brand.details.socialMediaCount,
                        hasWikipedia: brand.details.hasWikipedia,
                        hasPressPage: brand.details.hasPressPage,
                        brandMentionCount: brand.details.brandMentionCount,
                        hasPartners: brand.details.hasPartners,
                        hasAppStore: brand.details.hasAppStore,
                        hasPhysicalLocation: brand.details.hasPhysicalLocation
                    }
                },
                userTrust: {
                    score: brand.userTrustScore,
                    indicators: {
                        isHTTPS: brand.details.isHTTPS,
                        hasSecurityBadges: brand.details.hasSecurityBadges,
                        hasPrivacyPolicy: brand.details.hasPrivacyPolicy,
                        hasTermsOfService: brand.details.hasTermsOfService,
                        hasEmail: brand.details.hasEmail,
                        hasPhone: brand.details.hasPhone,
                        hasAddress: brand.details.hasAddress,
                        hasCustomerSupport: brand.details.hasCustomerSupport,
                        hasReviews: brand.details.hasReviews,
                        hasGoogleReviews: brand.details.hasGoogleReviews,
                        hasExternalReviewPlatform: brand.details.hasExternalReviewPlatform,
                        hasAnyRating: brand.details.hasAnyRating,
                        hasVerifiedReviews: brand.details.hasVerifiedReviews,
                        hasCertifications: brand.details.hasCertifications
                    }
                },
                yearsInOperation: {
                    score: brand.yearsInOperationScore,
                    indicators: {
                        foundedYear: brand.details.foundedYear,
                        estimatedYearsActive: brand.details.estimatedYearsActive
                    }
                }
            },
            metadata: {
                fetchTime: `${fetchTime}ms`,
                htmlSize: `${(htmlContent.length / 1024).toFixed(2)} KB`,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error("Traffic/Brand analysis error:", error);
        return NextResponse.json(
            { error: "An error occurred while analyzing the website." },
            { status: 500 }
        );
    } finally {
        if (browser) await browser.close();
    }
}