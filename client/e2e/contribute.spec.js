import { test, expect } from '@playwright/test';
import { login, openCourse } from './helpers';
import path from 'path';
import fs from 'fs';
import os from 'os';

test('write, see and delete a course review (UC-05, FR-13)', async ({ page }) => {
  await login(page, 'student2@aubh.edu.bh');
  await openCourse(page, 'COSC 360');
  await page.getByRole('link', { name: 'Write a review' }).first().click();
  await page.getByLabel('Semester you took it').selectOption('Spring 2026');
  for (const [label, n] of [
    ['Difficulty', 3],
    ['Workload', 3],
    ['Usefulness', 5],
    ['Assessment fairness', 4],
    ['Overall', 4],
  ]) {
    await page.getByRole('radio', { name: `${label}: ${n}`, exact: true }).click();
  }
  const text = `Subnetting takes practice; do every Packet Tracer lab. ${Date.now()}`;
  await page.getByLabel(/Your review/).fill(text);
  await page.getByRole('combobox', { name: 'Take before this course' }).fill('COSC 220');
  await page.getByRole('option', { name: /COSC 220/ }).click();
  await page.getByRole('button', { name: 'Submit review' }).click();
  await expect(page).toHaveURL(/\/reviews$/);
  await page.getByLabel('Sort reviews').selectOption('newest');
  await expect(page.getByText(text)).toBeVisible();

  await page.goto('/me/reviews');
  const card = page.locator('div.card', { hasText: 'COSC 360' }).first();
  await card.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Deleted.')).toBeVisible();
});

test('a review that names an instructor is held for moderation', async ({ page }) => {
  await login(page, 's071@aubh.edu.bh');
  await openCourse(page, 'COSC 230');
  await page
    .getByRole('link', { name: /Write a review|Edit your review/ })
    .first()
    .click();
  await page.getByLabel('Semester you took it').selectOption('Fall 2026');
  for (const label of ['Difficulty', 'Workload', 'Usefulness', 'Assessment fairness', 'Overall']) {
    await page.getByRole('radio', { name: `${label}: 3`, exact: true }).click();
  }
  await page.getByLabel(/Your review/).fill('Dr. Someone rushes every lecture.');
  await page.getByRole('button', { name: /Submit review|Save changes/ }).click();
  await expect(page).toHaveURL(/\/me\/reviews/);
  await expect(page.getByText('Held for moderation').first()).toBeVisible();
});

test('upload a PDF and find it with search and filters (UC-08, UC-09)', async ({ page }) => {
  const title = `E2E formula sheet ${Date.now()}`;
  const file = path.join(os.tmpdir(), 'e2e-sheet.pdf');
  fs.writeFileSync(
    file,
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF',
  );
  await login(page, 'student2@aubh.edu.bh');
  await page.goto('/resources/upload');
  await page.getByRole('radio', { name: 'Formula sheet' }).click();
  await page.getByLabel('Course', { exact: true }).selectOption({ label: 'COSC 330 · Database Systems' });
  await page.getByLabel('Choose a file').setInputFiles(file);
  await expect(page.getByText(/Checked/)).toBeVisible();
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByLabel('Tags').fill('e2e');
  await page.keyboard.press('Enter');
  await page.getByLabel(/I wrote this myself/).check();
  await page.getByRole('button', { name: 'Publish resource' }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  await page.goto('/resources');
  await page.getByLabel('Search resources').fill(title);
  await expect(page.getByRole('link', { name: title })).toBeVisible();
  // Filters live in the URL, so the checkbox updates after the navigation settles.
  await page.getByRole('checkbox', { name: 'Formula sheet' }).click();
  await expect(page.getByRole('checkbox', { name: 'Formula sheet' })).toBeChecked();
  await expect(page).toHaveURL(/types=formula_sheet/);
  await expect(page.getByRole('link', { name: title })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Notes' }).click();
  await page.getByRole('checkbox', { name: 'Formula sheet' }).click();
  await expect(page).toHaveURL(/types=notes(&|$)/);
  await expect(page.getByRole('link', { name: title })).toHaveCount(0);
});
