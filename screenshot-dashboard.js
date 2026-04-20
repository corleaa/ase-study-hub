const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
  });
  const page = await context.newPage();

  await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Force dark mode + hide landing/auth
  await page.evaluate(() => {
    document.body.setAttribute('data-theme', 'dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    var overlay = document.getElementById('landingOverlay');
    if (overlay) overlay.style.display = 'none';
    var authModal = document.getElementById('authModal');
    if (authModal) authModal.style.display = 'none';
  });

  await page.waitForSelector('.dash-window, .dash-hero, .sidebar-brand', { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(1500);

  await page.addStyleTag({
    content: `
      * { cursor: none !important; caret-color: transparent !important; }
      .toast, .toast-item, [class*="toast"], .notif-panel { display: none !important; }
    `
  });
  await page.waitForTimeout(400);

  await page.screenshot({
    path: '/Users/corleaa/Desktop/real-study-screenshots/pagina-principala.png',
    fullPage: false,
  });

  await browser.close();
  console.log('Done');
})();
