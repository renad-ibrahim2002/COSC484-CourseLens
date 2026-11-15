import { test, expect } from '@playwright/test';
import { login } from './helpers';

test('register, verify the email and land signed in (UC-01)', async ({ page }) => {
  const email = `e2e${Date.now()}@aubh.edu.bh`;
  await page.goto('/register');
  await page.getByLabel('Full name').fill('Playwright Student');
  await page.getByLabel('University email').fill(email);
  await expect(page.getByText('American University of Bahrain detected')).toBeVisible();
  await page.getByLabel('Major').selectOption({ label: 'Computer Science' });
  await page.getByLabel('Password').fill('Password123');
  await page.getByLabel(/I agree to the posting guidelines/).check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();
  // Without an email service the API returns the link in development.
  await page.getByRole('link', { name: 'open the link' }).click();
  await expect(page.getByRole('heading', { name: 'Email verified' })).toBeVisible();
  await page.getByRole('link', { name: 'Continue to CourseLens' }).click();
  await expect(page.getByRole('button', { name: /account menu for Playwright Student/i })).toBeVisible();
});

test('wrong password shows remaining attempts (FR-02)', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('University email').fill('s070@aubh.edu.bh');
  await page.getByLabel('Password').fill('wrong-password1');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(/attempts? left before a short lockout/);
  await login(page, 's070@aubh.edu.bh');
});

test('students cannot open the moderation queue', async ({ page }) => {
  await login(page, 'student2@aubh.edu.bh');
  await page.goto('/moderation');
  await expect(page.getByRole('heading', { name: 'You do not have access to this page' })).toBeVisible();
});
