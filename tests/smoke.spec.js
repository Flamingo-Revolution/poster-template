const { test, expect } = require('@playwright/test');

test('loads, renders, imports sample PDF, and exports PNG', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', error => consoleErrors.push(error.message));

  await page.goto('/flamingo-times-template-v2.html');
  await expect(page.getByRole('heading', { name: /Flamingo Times/i })).toBeVisible();

  const canvas = page.locator('#poster');
  await expect(canvas).toBeVisible();

  const hasPaintedPixels = await canvas.evaluate(node => {
    const ctx = node.getContext('2d');
    const { width, height } = node;
    const sample = ctx.getImageData(Math.floor(width / 2), Math.floor(height / 2), 1, 1).data;
    return sample[0] !== 0 || sample[1] !== 0 || sample[2] !== 0;
  });
  expect(hasPaintedPixels).toBe(true);

  await page.getByRole('button', { name: /Test with Sample/i }).click();
  await expect(page.locator('#pdfStatus')).toContainText(/All \d+ pages loaded/i);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^flamingo-times-.+\.png$/);

  expect(consoleErrors).toEqual([]);
});
