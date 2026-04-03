const { test, expect } = require('@playwright/test');

test('homepage loads and shows Study Hub shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Study Hub')).toBeVisible();
  await expect(page.getByRole('button', { name: /intră în cont/i })).toBeVisible();
});
