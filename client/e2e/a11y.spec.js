import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login, openCourse } from './helpers';

// NFR-05: WCAG 2.1 AA, no critical or serious axe violations on the main pages.
const scan = async (page) => {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return violations.filter((v) => ['critical', 'serious'].includes(v.impact)).map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`);
};

const GUEST_PAGES = ['/', '/universities', '/login', '/register', '/reset-password', '/resources'];

for (const path of GUEST_PAGES) {
  test(`no serious accessibility issues: ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(await scan(page)).toEqual([]);
  });
}

test('no serious accessibility issues on signed-in pages', async ({ page }) => {
  await login(page, 'student@aubh.edu.bh');
  await openCourse(page, 'COSC 484');
  const course = new URL(page.url()).pathname;
  for (const path of [course, `${course}/reviews`, `${course}/midterms`, `${course}/combos`, `${course}/review`, `${course}/rate`, '/resources/upload', '/me/reviews', '/me/uploads', '/me/bookmarks', '/me/settings', '/moderation', '/moderation/log']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(await scan(page), path).toEqual([]);
  }
});

test('no serious accessibility issues on admin pages', async ({ page }) => {
  await login(page, 'admin@aubh.edu.bh');
  for (const path of ['/admin/catalog', '/admin/suggestions', '/admin/users', '/admin/stats']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(await scan(page), path).toEqual([]);
  }
});
