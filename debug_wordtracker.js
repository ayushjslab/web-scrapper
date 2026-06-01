const puppeteer = require('puppeteer');
const fs = require('fs');

async function debug() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    console.log("Navigating to Wordtracker...");
    await page.goto('https://www.wordtracker.com/search?query=traffic%20boost', {
        waitUntil: 'networkidle2',
        timeout: 60000
    });

    console.log("Waiting for 5 seconds for dynamic content...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log("Taking screenshot...");
    await page.screenshot({ path: '/home/ayush/projects/web-scraper/wordtracker_debug.png', fullPage: true });

    const html = await page.content();
    fs.writeFileSync('/home/ayush/projects/web-scraper/wordtracker_debug.html', html);

    console.log("Screenshot and HTML saved.");
    await browser.close();
}

debug().catch(console.error);
