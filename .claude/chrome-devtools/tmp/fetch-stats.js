import { getBrowser, getPage, disconnectBrowser, outputJSON } from 'file:///C:/Users/Admin/.claude/skills/chrome-devtools/scripts/lib/browser.js';

async function fetchStats() {
  try {
    const browser = await getBrowser();
    const page = await getPage(browser);

    // Fetch all requests with high limit
    const result = await page.evaluate(async () => {
      const response = await fetch('/api/requests?limit=5000');
      const data = await response.json();

      if (!data.success) return { error: 'API error', data };

      const requests = data.data;
      const total = data.total;

      // Count by CODE pattern (RQ- prefix = leads, other = bookings)
      let leads = 0;
      let bookings = 0;
      requests.forEach(r => {
        if (r.code && r.code.startsWith('RQ-')) {
          leads++;
        } else {
          bookings++;
        }
      });

      // Count by stage
      const byStage = {};
      requests.forEach(r => {
        byStage[r.stage] = (byStage[r.stage] || 0) + 1;
      });

      // Count by status
      const byStatus = {};
      requests.forEach(r => {
        byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      });

      // Latest 10
      const latest10 = requests.slice(0, 10).map(r => ({
        code: r.code,
        rqid: r.rqid,
        bookingCode: r.bookingCode,
        customer: r.customerName,
        status: r.status,
        stage: r.stage
      }));

      return {
        total_in_db: total,
        fetched_count: requests.length,
        leads_rq_prefix: leads,
        bookings_other: bookings,
        by_stage: byStage,
        by_status: byStatus,
        latest_10: latest10
      };
    });

    outputJSON({ success: true, ...result });
    await disconnectBrowser();
  } catch (err) {
    outputJSON({ success: false, error: err.message });
  }
}

fetchStats();
