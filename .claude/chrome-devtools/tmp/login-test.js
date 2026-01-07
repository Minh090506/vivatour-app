import { getBrowser, getPage, disconnectBrowser, outputJSON } from 'file:///C:/Users/Admin/.claude/skills/chrome-devtools/scripts/lib/browser.js';

async function loginAndScreenshot() {
  try {
    const browser = await getBrowser();
    const page = await getPage(browser);

    // Navigate to login
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });

    // Clear and fill email
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      await emailInput.click({ clickCount: 3 });
      await emailInput.type('admin@vivatour.vn');
    }

    // Clear and fill password
    const passInput = await page.$('input[type="password"]');
    if (passInput) {
      await passInput.click({ clickCount: 3 });
      await passInput.type('admin123!');
    }

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});

    // Wait a bit more
    await new Promise(r => setTimeout(r, 2000));

    // Navigate to requests page
    await page.goto('http://localhost:3000/requests', { waitUntil: 'networkidle2' });

    // Take screenshot
    const screenshotPath = 'C:/Users/Admin/Projects/company-workflow-app/vivatour-app/.claude/chrome-devtools/screenshots/requests-page.png';
    await page.screenshot({ path: screenshotPath, fullPage: false });

    outputJSON({
      success: true,
      url: page.url(),
      title: await page.title(),
      screenshot: screenshotPath
    });

    await disconnectBrowser();
  } catch (err) {
    outputJSON({ success: false, error: err.message });
  }
}

loginAndScreenshot();
