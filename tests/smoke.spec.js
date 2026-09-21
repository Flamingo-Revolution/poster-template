const { test, expect } = require('@playwright/test');

test('auto-composes from the sample PDF, supports Make Poster, and exports PNG', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', error => consoleErrors.push(error.message));

  // 1. Root loads
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Flamingo Times/i })).toBeVisible();

  const canvas = page.locator('#poster');
  await expect(canvas).toBeVisible();

  const hasPaintedPixels = () => canvas.evaluate(node => {
    const ctx = node.getContext('2d');
    const { width, height } = node;
    const sample = ctx.getImageData(Math.floor(width / 2), Math.floor(height / 2), 1, 1).data;
    return sample[0] !== 0 || sample[1] !== 0 || sample[2] !== 0;
  });

  // Poster is already composed automatically at startup, before any upload.
  expect(await hasPaintedPixels()).toBe(true);
  await expect(page.locator('#pdfStatus')).toContainText(/Poster ready/i);
  await expect(page.locator('#pageComposition')).toHaveValue('auto');
  await expect(page.locator('#pageComposition')).toContainText('1 Page');
  await expect(page.locator('#pageComposition')).toContainText('2 Pages');
  await expect(page.locator('#pageComposition')).toContainText('3 Pages');
  await expect(page.locator('#pageComposition')).toContainText('Custom 4+');
  await expect(page.locator('#themePresets .preset')).toHaveCount(18);

  // Visual Direction applies immediately and keeps Featured Pages in sync.
  await page.locator('#visualDirection').selectOption('campaign_fan');
  await expect(page.locator('#pdfStatus')).toContainText(/Campaign Fan/);
  await expect(page.locator('#readyMeta')).toContainText(/Campaign Fan/);
  await expect(page.locator('#pageComposition')).toHaveValue('three_pages');
  await page.locator('#visualDirection').selectOption('hero_cover');
  await expect(page.locator('#readyMeta')).toContainText(/Hero Cover/);
  await expect(page.locator('#pageComposition')).toHaveValue('one_page');
  await page.locator('#pageComposition').selectOption('auto');

  // Color combinations are first-class art-direction controls.
  const cornerPixel = () => canvas.evaluate(node => {
    const sample = node.getContext('2d').getImageData(20, 20, 1, 1).data;
    return Array.from(sample).join(',');
  });
  const beforeThemePixel = await cornerPixel();
  await page.getByRole('button', { name: /Night Edition/i }).click();
  await expect(page.locator('#bgHex')).toHaveValue('#17171B');
  await expect(page.locator('#logoMode')).toHaveValue('pink_cream');
  expect(await cornerPixel()).not.toBe(beforeThemePixel);

  // Typography controls: Blackletter + size sliders update state and render.
  await page.locator('#titleFont').selectOption('blackletter');
  await expect(page.locator('#titleFont')).toHaveValue('blackletter');
  await page.locator('#titleFontSize').evaluate(node => {
    node.value = '0.11';
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('#outTitleFontSize')).toHaveText('11.0%');
  await page.locator('#metaFontSize').evaluate(node => {
    node.value = '0.022';
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('#outMetaFontSize')).toHaveText('2.2%');
  expect(await hasPaintedPixels()).toBe(true);

  // 2 & 3. Sample PDF can be clicked, and the poster becomes ready automatically.
  await page.getByRole('button', { name: /Use Sample/i }).click();
  await expect(page.locator('#pdfStatus')).toContainText(/Poster ready/i, { timeout: 15000 });
  await expect(page.locator('#pdfInput')).toBeEnabled();
  await expect(page.locator('#pageComposition')).toHaveValue('custom_many');
  expect(await hasPaintedPixels()).toBe(true);

  await page.locator('#pageComposition').selectOption('one_page');
  await expect(page.locator('#pdfStatus')).toContainText(/1 Page/);
  await page.locator('#pageComposition').selectOption('three_pages');
  await expect(page.locator('#pdfStatus')).toContainText(/3 Pages/);

  // Designer-friendly paper naming (no "Paper 1/2/3" array-index labels), inside its Fine Tune group.
  await page.locator('#fineTuneSelectedPaper summary').click();
  await expect(page.getByRole('button', { name: 'Back / Center' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Front / Left' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Front / Right' })).toBeVisible();

  // 4. "Make Poster" works.
  await page.getByRole('button', { name: /Make Poster/i }).click();
  await expect(page.locator('#pdfStatus')).toContainText(/Poster composed/i);

  // 5. Canvas is nonblank.
  expect(await hasPaintedPixels()).toBe(true);

  // 6. PNG export downloads and confirms.
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^flamingo-times-.+\.png$/);
  await expect(page.locator('#pdfStatus')).toContainText(/PNG exported: flamingo-times-/i);

  // 7. No console errors throughout the flow.
  expect(consoleErrors).toEqual([]);
});
