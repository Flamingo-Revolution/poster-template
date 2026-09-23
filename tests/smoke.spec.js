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

  // Visual Direction applies immediately without changing Featured Pages.
  await page.locator('#visualDirection').selectOption('campaign_fan');
  await expect(page.locator('#pdfStatus')).toContainText(/Campaign Fan/);
  await expect(page.locator('#readyMeta')).toContainText(/Campaign Fan/);
  await expect(page.locator('#pageComposition')).toHaveValue('auto');
  await page.locator('#pageComposition').selectOption('one_page');
  await page.locator('#visualDirection').selectOption('clean_feature');
  await expect(page.locator('#readyMeta')).toContainText(/Clean Feature/);
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

test('supports moving title and logo up and down with sliders, canvas dragging, and undo/redo', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', error => consoleErrors.push(error.message));

  await page.goto('/');
  const canvas = page.locator('#poster');
  await expect(canvas).toBeVisible();

  // 1. Sliders exist with default 0 px
  await expect(page.locator('#titleY')).toHaveValue('0');
  await expect(page.locator('#outTitleY')).toHaveText('0 px');
  await expect(page.locator('#logoY')).toHaveValue('0');
  await expect(page.locator('#outLogoY')).toHaveText('0 px');

  // Helper to read pixel color at canvas coordinates
  const pixelAt = (x, y) => canvas.evaluate((node, coords) => {
    const ctx = node.getContext('2d');
    const d = ctx.getImageData(coords.x, coords.y, 1, 1).data;
    return `${d[0]},${d[1]},${d[2]},${d[3]}`;
  }, { x, y });

  // 2. Adjust title position down
  const initialTitlePixel = await pixelAt(540, 115);
  await page.locator('#titleY').evaluate(node => {
    node.value = '40';
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('#outTitleY')).toHaveText('+40 px');
  await expect(page.locator('#fineTitleY')).toHaveValue('40');
  await expect(page.locator('#outFineTitleY')).toHaveText('+40 px');
  expect(await pixelAt(540, 115)).not.toBe(initialTitlePixel);

  // 3. Adjust logo position up
  const initialLogoPixel = await pixelAt(540, 1260);
  await page.locator('#logoY').evaluate(node => {
    node.value = '-80';
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('#outLogoY')).toHaveText('-80 px');
  await expect(page.locator('#fineLogoY')).toHaveValue('-80');
  await expect(page.locator('#outFineLogoY')).toHaveText('-80 px');
  expect(await pixelAt(540, 1260)).not.toBe(initialLogoPixel);

  // 4. Test Undo and Redo
  await page.keyboard.press('Control+z');
  await expect(page.locator('#logoY')).toHaveValue('0');
  await expect(page.locator('#outLogoY')).toHaveText('0 px');

  await page.keyboard.press('Control+y');
  await expect(page.locator('#logoY')).toHaveValue('-80');
  await expect(page.locator('#outLogoY')).toHaveText('-80 px');

  // 5. Test Reset Layout
  await page.locator('#btnQuickReset').click();
  await expect(page.locator('#titleY')).toHaveValue('0');
  await expect(page.locator('#outTitleY')).toHaveText('0 px');
  await expect(page.locator('#logoY')).toHaveValue('0');
  await expect(page.locator('#outLogoY')).toHaveText('0 px');

  // 6. Test Canvas Dragging for Title
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  // Drag near the top center (title area)
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.085);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.085 + 30, { steps: 5 });
  await page.mouse.up();
  const titleYAfterDrag = parseInt(await page.locator('#titleY').inputValue(), 10);
  expect(titleYAfterDrag).not.toBe(0);

  // 7. Toggle showBgLogo disables/hides logo controls
  await page.locator('#fineTuneColors summary').click();
  await page.locator('#showBgLogo').uncheck();
  await expect(page.locator('#logoY')).toBeDisabled();
  await page.locator('#showBgLogo').check();
  await expect(page.locator('#logoY')).toBeEnabled();

  expect(consoleErrors).toEqual([]);
});


test('supports multiple PDF uploads, mini gallery, and adding up to 10 pages', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('/');

  // 1. Initially, mini gallery should be hidden
  await expect(page.locator('#miniGalleryWrap')).toBeHidden();

  // 2. Upload first PDF
  const fileChooserPromise1 = page.waitForEvent('filechooser');
  await page.locator('#pdfInputLabel').click();
  const fileChooser1 = await fileChooserPromise1;
  await fileChooser1.setFiles('assets/sample-edition.pdf');

  await expect(page.locator('#pdfStatus')).toContainText('Poster ready', { timeout: 10000 });
  await expect(page.locator('#miniGalleryWrap')).toBeVisible();
  await expect(page.locator('#galleryCount')).toHaveText('4');
  await expect(page.locator('.gallery-item')).toHaveCount(4);

  // 3. Upload second PDF
  const fileChooserPromise2 = page.waitForEvent('filechooser');
  await page.locator('#pdfInputLabel').click();
  const fileChooser2 = await fileChooserPromise2;
  await fileChooser2.setFiles('assets/sample-edition.pdf');

  await expect(page.locator('#pdfStatus')).toContainText('appended to gallery', { timeout: 10000 });
  await expect(page.locator('#galleryCount')).toHaveText('8');
  await expect(page.locator('.gallery-item')).toHaveCount(8);

  // 4. Click a gallery item to add to poster
  const initialTabs = await page.locator('.paper-tab').count();
  await page.locator('.gallery-item').nth(4).locator('.add-btn').click({ force: true });
  const newTabs = await page.locator('.paper-tab').count();
  expect(newTabs).toBe(initialTabs + 1);

  // 5. Clear gallery
  await page.locator('#btnClearGallery').click();
  await expect(page.locator('#miniGalleryWrap')).toBeHidden();

  expect(consoleErrors).toEqual([]);
});

