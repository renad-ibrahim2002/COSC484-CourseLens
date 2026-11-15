import { test, expect } from '@playwright/test';
import { login } from './helpers';

test('a moderator reviews a report and the decision is logged (UC-11)', async ({ page }) => {
  await login(page, 'student@aubh.edu.bh');
  await page.goto('/moderation');
  await expect(page.getByRole('heading', { name: 'Report queue' })).toBeVisible();
  const row = page
    .getByRole('row')
    .filter({ hasText: /Week 3 notes|Buy my notes|total joke/ })
    .first();
  const item = (await row.locator('p').first().textContent()).trim();
  await row.getByRole('link', { name: /Review report/ }).click();
  await page.getByRole('radio', { name: /Dismiss reports/ }).click();
  await page.getByLabel('Note for the log').fill('Checked by e2e test');
  await page.getByRole('button', { name: 'Confirm decision' }).click();
  await expect(page).toHaveURL(/\/moderation$/);
  await expect(page.getByText(item)).toHaveCount(0);
  await page.getByRole('link', { name: 'Moderation log' }).click();
  await expect(page.getByText('Checked by e2e test').first()).toBeVisible();
});
