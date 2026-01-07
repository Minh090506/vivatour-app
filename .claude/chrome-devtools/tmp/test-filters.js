import { getBrowser, getPage, disconnectBrowser, outputJSON } from 'file:///C:/Users/Admin/.claude/skills/chrome-devtools/scripts/lib/browser.js';

async function testFilters() {
  try {
    const browser = await getBrowser();
    const page = await getPage(browser);

    // Click on first SelectTrigger (Stage/Phễu dropdown)
    const triggers = await page.$$('button[role="combobox"]');
    if (triggers.length > 0) {
      await triggers[0].click();
      await new Promise(r => setTimeout(r, 500));
    }

    // Take screenshot of dropdown open
    await page.screenshot({
      path: 'C:/Users/Admin/Projects/company-workflow-app/vivatour-app/.claude/chrome-devtools/screenshots/filter-dropdown-open.png'
    });

    // Click on "Lead" option using XPath
    const leadOption = await page.$x('//div[@role="option"][contains(text(), "Lead")]');
    if (leadOption.length > 0) {
      await leadOption[0].click();
    }
    await new Promise(r => setTimeout(r, 1500));

    // Take screenshot after filtering
    await page.screenshot({
      path: 'C:/Users/Admin/Projects/company-workflow-app/vivatour-app/.claude/chrome-devtools/screenshots/filter-stage-lead.png'
    });

    // Get current URL to verify filter param
    const url = page.url();

    outputJSON({
      success: true,
      message: 'Filter test completed',
      url: url
    });

    await disconnectBrowser();
  } catch (err) {
    outputJSON({ success: false, error: err.message, stack: err.stack });
  }
}

testFilters();
