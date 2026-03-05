const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--use-fake-ui-for-media-stream'] });
    const page = await browser.newPage();

    // Catch console logs
    page.on('console', msg => {
        console.log(`BROWSER CONSOLE [${msg.type()}]:`, msg.text());
        if (msg.type() === 'error') {
            console.error(`ERROR ARGUMENTS:`, msg.args()); // Cannot resolve args easily over IPC but we will try to see type
        }
    });

    try {
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

        console.log("Selecting Language...");
        await page.evaluate(() => {
            selectLanguage('en');
        });
        await new Promise(r => setTimeout(r, 1000));

        console.log("Selecting Service...");
        await page.evaluate(() => {
            selectService('archana');
        });
        await new Promise(r => setTimeout(r, 1000));

        console.log("Clicking Voice Input button...");
        await page.evaluate(() => {
            startVoiceInput('name');
        });

        await new Promise(r => setTimeout(r, 5000)); // Wait for voice overlay and logic to run
    } catch (err) {
        console.error("Puppeteer Error:", err);
    } finally {
        await browser.close();
    }
})();
