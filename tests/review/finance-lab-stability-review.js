const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const OUT_DIR = path.join(process.cwd(), 'test-results', 'stability-review-pack');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function text(page, selector) {
  const value = await page.locator(selector).first().textContent();
  return String(value || '').trim();
}

async function main() {
  ensureDir(OUT_DIR);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 2200 } });
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3001';

  await page.addInitScript(() => {
    window.localStorage.setItem('ash_onboarding_done', '1');
  });
  await page.goto(baseURL);
  await page.locator('[data-tab="finance"], button:has-text("Finance Lab"), a:has-text("Finance Lab")').first().click();
  await page.locator('[data-finance-mode="stability"]').first().click();
  await page.waitForTimeout(500);

  const scenarios = ['baseline', 'inflation_shock', 'fiscal_crisis', 'credit_bubble', 'banking_stress', 'external_shock'];
  const summary = [];

  for (const scenario of scenarios) {
    await page.locator(`[data-fin-scenario-card="${scenario}"]`).first().click();
    await page.waitForTimeout(350);

    const heroFile = path.join(OUT_DIR, `${scenario}-hero.png`);
    const section3File = path.join(OUT_DIR, `${scenario}-section3.png`);
    const section4File = path.join(OUT_DIR, `${scenario}-section4.png`);

    await page.locator('.finance-sim-hero').first().screenshot({ path: heroFile });
    await page.locator('.finance-zone').nth(2).screenshot({ path: section3File });
    await page.locator('.finance-zone').nth(3).screenshot({ path: section4File });

    summary.push({
      scenario,
      gauge: await text(page, '#finStressGaugeValue'),
      gaugeState: await text(page, '#finStressGaugeState'),
      systemicRisk: await text(page, '#finKpiNpv'),
      tailLoss: await text(page, '#finKpiLoss'),
      ccyb: await text(page, '#finKpiCapital'),
      stability: await text(page, '#finKpiStability'),
      state: await text(page, '#finNodeStateVal'),
      banks: await text(page, '#finNodeBanksVal'),
      firms: await text(page, '#finNodeFirmsVal'),
      households: await text(page, '#finNodeHouseholdsVal'),
      explainer: await text(page, '#finShockExplainer')
    });
  }

  const summaryPath = path.join(OUT_DIR, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  const prompt = [
    '# Finance Lab Stability Review Pack',
    '',
    'Use the screenshots and JSON summary in this folder to review the `Finance Lab > Stabilitate` experience.',
    '',
    'Review goals:',
    '- detect visual bugs or overflow',
    '- identify weak contrast or unclear charts',
    '- say whether scenarios feel meaningfully different',
    '- say whether shock propagation feels reactive',
    '- judge whether the page is understandable for a finance student',
    '- point out anything that still looks unfinished or misleading',
    '',
    'Files:',
    '- screenshots: one hero + section 3 + section 4 for each scenario',
    '- summary.json: key numeric outputs for each scenario',
    '',
    'Ask specifically:',
    '- Does baseline look plausibly calm relative to stress scenarios?',
    '- Do section 3 and section 4 charts communicate meaning without extra explanation?',
    '- Are scorecards and policy charts legible enough?',
    '- Does the simulator feel like a coherent learning tool rather than a generic dashboard?'
  ].join('\n');

  fs.writeFileSync(path.join(OUT_DIR, 'review-prompt.md'), prompt);

  await browser.close();
  console.log(`Review pack written to ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
