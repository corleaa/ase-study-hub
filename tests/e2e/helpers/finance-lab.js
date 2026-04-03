const { expect } = require('@playwright/test');

async function dismissOnboardingIfPresent(page) {
  const overlay = page.locator('#onboardingOverlay.open').first();
  if (await overlay.count()) {
    const skipBtn = page.locator('[data-app-action="close-onboarding"]').first();
    if (await skipBtn.isVisible()) {
      await skipBtn.click();
      await expect(overlay).toBeHidden();
    }
  }
}

async function openFinanceLabStability(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('ash_onboarding_done', '1');
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Study Hub' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /intră în cont/i }).first()).toBeVisible();
  await dismissOnboardingIfPresent(page);

  const financeNav = page.locator('[data-tab="finance"], button:has-text("Finance Lab"), a:has-text("Finance Lab")').first();
  await financeNav.click();

  const stabilityTab = page.locator('[data-finance-mode="stability"]').first();
  await expect(stabilityTab).toBeVisible();
  await stabilityTab.click();

  await expect(page.getByText('System Stress Gauge')).toBeVisible();
  await expect(page.getByText('Shock Propagation')).toBeVisible();
}

async function selectStabilityScenario(page, scenario) {
  const btn = page.locator(`[data-fin-scenario-card="${scenario}"]`).first();
  await expect(btn).toBeVisible();
  await btn.click();
}

async function setFinanceSlider(page, field, value) {
  const range = page.locator(`input[type="range"][data-finance-input="${field}"]`).first();
  await expect(range).toBeVisible();
  await range.evaluate((el, next) => {
    el.value = String(next);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function readGaugeValue(page) {
  const text = await page.locator('#finStressGaugeValue').first().textContent();
  return Number(String(text || '').trim());
}

async function readNodeValue(page, nodeId) {
  const text = await page.locator(`#finNode${nodeId}Val`).first().textContent();
  return Number(String(text || '').replace('/100', '').trim());
}

async function readKpiValue(page, id) {
  return String(await page.locator(`#${id}`).first().textContent() || '').trim();
}

async function expectInsideViewport(locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box.width).toBeGreaterThan(0);
  expect(box.height).toBeGreaterThan(0);
}

module.exports = {
  openFinanceLabStability,
  selectStabilityScenario,
  setFinanceSlider,
  readGaugeValue,
  readNodeValue,
  readKpiValue,
  expectInsideViewport
};
