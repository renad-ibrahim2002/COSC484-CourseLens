import { test, expect } from '@playwright/test';

test('a guest finds a course and reads its ratings in three clicks (NFR-04)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Know the course before you register.' })).toBeVisible();
  await page.getByRole('button', { name: 'Show courses' }).click(); // 1
  await expect(page.getByRole('heading', { name: 'Computer Science courses' })).toBeVisible();
  await page.getByRole('link', { name: /COSC 101/ }).click(); // 2
  await expect(page.getByRole('heading', { name: 'Introduction to Programming' })).toBeVisible();
  await expect(page.getByLabel('Overall rating')).toContainText('/ 5');
  await expect(page.getByRole('meter', { name: 'Difficulty' }).first()).toBeVisible();
});

test('guests see review previews and must log in to download', async ({ page }) => {
  await page.goto('/resources?q=JWT');
  await page.getByRole('link', { name: 'Express + JWT auth cheat sheet' }).click();
  await expect(page.getByRole('link', { name: 'Log in to preview' })).toBeVisible();
  await page.getByRole('button', { name: /Download PDF/ }).click();
  await expect(page).toHaveURL(/\/login\?next=/);
});
