const { test, expect } = require('@playwright/test');
const {
  openFinanceLabStability,
  selectStabilityScenario,
  expectInsideViewport
} = require('./helpers/finance-lab');

async function saveSectionShot(page, locator, name) {
  await expect(locator).toBeVisible();
  await expectInsideViewport(locator);
  await locator.screenshot({ path: `test-results/stability-visual/${name}.png` });
}

test.describe('Finance Lab Stability visual bot', () => {
  test('captures core sections and checks for obvious visual breakage', async ({ page }) => {
    await openFinanceLabStability(page);

    const hero = page.locator('.finance-sim-hero').first();
    const brief = page.locator('.finance-stability-brief').first();
    const sections = page.locator('.finance-zone');

    await saveSectionShot(page, hero, 'hero-baseline');
    await saveSectionShot(page, brief, 'how-to-read');
    await saveSectionShot(page, sections.nth(0), 'section-1-baseline');
    await saveSectionShot(page, sections.nth(1), 'section-2-baseline');
    await saveSectionShot(page, sections.nth(2), 'section-3-baseline');
    await saveSectionShot(page, sections.nth(3), 'section-4-baseline');

    await expect(page.locator('#finScorecard table')).toBeVisible();
    await expect(page.locator('#finDistributionChart svg')).toBeVisible();
    await expect(page.locator('#finStabilityChart svg')).toBeVisible();
    await expect(page.locator('#finPolicyChart svg')).toBeVisible();
    await expect(page.locator('#finNetworkChart svg')).toBeVisible();

    for (const locator of await page.locator('.finance-control-number').all()) {
      await expectInsideViewport(locator);
    }

    await selectStabilityScenario(page, 'external_shock');
    await saveSectionShot(page, hero, 'hero-external-shock');
    await saveSectionShot(page, sections.nth(3), 'section-4-external-shock');
  });
});
