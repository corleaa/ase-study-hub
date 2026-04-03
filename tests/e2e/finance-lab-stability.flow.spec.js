const { test, expect } = require('@playwright/test');
const {
  openFinanceLabStability,
  selectStabilityScenario,
  setFinanceSlider,
  readGaugeValue,
  readNodeValue,
  readKpiValue
} = require('./helpers/finance-lab');

test.describe('Finance Lab Stability flow bot', () => {
  test('scenario changes update gauge, KPIs and propagation nodes', async ({ page }) => {
    await openFinanceLabStability(page);

    const baselineGauge = await readGaugeValue(page);
    const baselineState = await readNodeValue(page, 'State');
    const baselineBanks = await readNodeValue(page, 'Banks');

    await selectStabilityScenario(page, 'banking_stress');

    await expect(page.locator('[data-fin-scenario-card="banking_stress"]')).toHaveClass(/active/);
    const stressGauge = await readGaugeValue(page);
    const stressState = await readNodeValue(page, 'State');
    const stressBanks = await readNodeValue(page, 'Banks');

    expect(stressGauge).toBeGreaterThan(baselineGauge);
    expect(stressBanks).toBeGreaterThan(baselineBanks);
    expect(stressState).toBeGreaterThanOrEqual(baselineState);

    await expect(page.locator('#finStressGaugeState')).not.toHaveText(/^$/);
    await expect(page.locator('#finShockExplainer')).toContainText('Lanțul de propagare');
  });

  test('manual input changes move the model, not just the UI shell', async ({ page }) => {
    await openFinanceLabStability(page);

    const beforeGauge = await readGaugeValue(page);
    const beforeSystemic = await readKpiValue(page, 'finKpiNpv');
    const beforeHouseholds = await readNodeValue(page, 'Households');

    await setFinanceSlider(page, 'marketVol', 42);
    await setFinanceSlider(page, 'contagionRisk', 58);
    await setFinanceSlider(page, 'policyRate', 9.1);

    const afterGauge = await readGaugeValue(page);
    const afterSystemic = await readKpiValue(page, 'finKpiNpv');
    const afterHouseholds = await readNodeValue(page, 'Households');

    expect(afterGauge).toBeGreaterThan(beforeGauge);
    expect(afterSystemic).not.toBe(beforeSystemic);
    expect(afterHouseholds).toBeGreaterThanOrEqual(beforeHouseholds);
  });

  test('network detail modal opens from contagion map', async ({ page }) => {
    await openFinanceLabStability(page);
    await page.locator('[data-finance-network]').first().click();
    await expect(page.locator('#modalContainer .modal-title')).toBeVisible();
    await expect(page.locator('#modalContainer')).toContainText(/Interpretare la scorul actual/i);
  });
});
