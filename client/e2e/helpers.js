export const PASSWORD = 'CourseLens1';

export async function login(page, email, password = PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('University email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

export async function openCourse(page, code) {
  await page
    .getByRole('combobox', { name: /search a course code/i })
    .first()
    .fill(code);
  await page
    .getByRole('option', { name: new RegExp(code) })
    .first()
    .click();
  await page.waitForURL(/\/courses\//);
}
