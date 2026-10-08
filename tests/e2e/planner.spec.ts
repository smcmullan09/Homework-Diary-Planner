import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import type { AppData } from '../../src/lib/types';
import AxeBuilder from '@axe-core/playwright';
async function login(page: Page) {
  if (!process.env.OWNER_EMAIL || !process.env.OWNER_PASSWORD)
    throw new Error('Set OWNER_EMAIL and OWNER_PASSWORD for the test account before UI tests.');
  await page.goto('/login');
  await page.getByLabel('Email address', { exact: true }).fill(process.env.OWNER_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(process.env.OWNER_PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL('/');
}
test('secure sign-in, homework CRUD, timer refresh and subject deletion protection', async ({
  page,
  request,
}) => {
  expect((await request.get('/api/data')).status()).toBe(401);
  expect((await request.get('/api/cron/reminders')).status()).toBe(401);
  await page.goto('/homework');
  await expect(page).toHaveURL('/login');
  await login(page);
  const origin = new URL(process.env.APP_URL || 'http://127.0.0.1:3000').origin;
  const initial = (await (await page.request.get('/api/data')).json()) as AppData;
  expect(
    (
      await page.request.post('/api/subjects', {
        headers: { Origin: 'https://untrusted.example' },
        data: { name: 'Blocked', colour: '#72957b' },
      })
    ).status(),
  ).toBe(403);
  const name = `UI test ${Date.now()}`;
  let taskId = '';
  let subjectId = '';
  try {
    await page.goto('/subjects');
    await page.getByRole('button', { name: 'Add subject', exact: true }).first().click();
    await page.getByLabel('Subject name').fill(name);
    await page.getByRole('button', { name: 'Save subject' }).click();
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    subjectId = ((await (await page.request.get('/api/data')).json()) as AppData).subjects.find(
      (s) => s.name === name,
    )!.id;
    await page.goto('/homework/new');
    await page.getByLabel('Homework title').fill(`${name} homework`);
    await page.getByRole('combobox', { name: 'Subject *', exact: true }).selectOption(subjectId);
    await page
      .getByLabel('Description / instructions')
      .fill('A real create, edit, complete and delete browser test.');
    await page.getByLabel('Estimated time (minutes)').fill('25');
    await page.getByRole('button', { name: 'Add homework', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${name} homework`);
    taskId = new URL(page.url()).pathname.split('/').pop()!;
    expect(
      (
        await page.request.delete('/api/subjects', {
          headers: { Origin: origin },
          data: { id: subjectId },
        })
      ).status(),
    ).toBe(409);
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByLabel('Homework title').fill(`${name} edited`);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${name} edited`);
    await page.getByRole('button', { name: 'Mark complete', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Mark incomplete', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Mark incomplete', exact: true }).click();
    await page.getByRole('link', { name: 'Start studying', exact: true }).click();
    await page.getByLabel('Custom duration in minutes').pressSequentially('150');
    await expect(page.getByLabel('Custom duration in minutes')).toHaveValue('150');
    await expect(page.getByRole('timer')).toHaveText('02:30:00');
    await page.getByRole('button', { name: '25m', exact: true }).click();
    await page.getByRole('button', { name: 'Stopwatch', exact: true }).click();
    await page.getByRole('button', { name: 'Start focus' }).click();
    await expect.poll(async () => page.getByRole('timer').textContent()).not.toBe('00:00');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Homework', exact: true })).toHaveValue(taskId);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('button', { name: 'Finish session', exact: true }).click();
    await expect(page.getByText(`${name} edited`, { exact: true }).last()).toBeVisible();
    const data = (await (await page.request.get('/api/data')).json()) as AppData;
    expect(data.sessions.some((s) => s.homeworkId === taskId && s.durationSeconds >= 1)).toBe(true);
    const exported = await (await page.request.get('/api/export')).json();
    expect(exported.version).toBe(1);
    expect(exported.passwordHash).toBeUndefined();
    expect(
      (
        await page.request.post('/api/import', {
          headers: { Origin: origin },
          data: { version: 999 },
        })
      ).status(),
    ).toBe(400);
    await page.goto(`/homework/${taskId}`);
    await page.getByRole('button', { name: 'Delete homework' }).click();
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page).toHaveURL('/homework');
    taskId = '';
    await page.goto('/subjects');
    await page.getByRole('button', { name: `Delete ${name}`, exact: true }).click();
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByRole('heading', { name, exact: true })).toHaveCount(0);
    subjectId = '';
  } finally {
    if (taskId)
      await page.request.delete('/api/homework', {
        headers: { Origin: origin },
        data: { id: taskId },
      });
    if (subjectId)
      await page.request.delete('/api/subjects', {
        headers: { Origin: origin },
        data: { id: subjectId },
      });
  }
});
test('all main routes render in desktop, mobile and dark mode without overflow', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /hydrat/i.test(message.text())) errors.push(message.text()); });
  await login(page);
  mkdirSync('artifacts', { recursive: true });
  const routes = [
    '/',
    '/homework',
    '/calendar',
    '/timetable',
    '/timetable/setup',
    '/subjects',
    '/timer',
    '/notifications',
    '/settings',
    '/setup',
  ];
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator('h1')).toBeVisible();
    expect(
      await page.locator('body').evaluate((el) => el.scrollWidth <= window.innerWidth + 1),
      `${route} desktop overflow`,
    ).toBe(true);
  }
  await page.goto('/');
  await page.screenshot({ path: 'artifacts/dashboard-desktop.png', fullPage: true, caret: 'initial' });
  await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect
    .poll(
      async () => ((await (await page.request.get('/api/data')).json()) as AppData).settings.theme,
    )
    .toBe('dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: 'artifacts/dashboard-dark.png', fullPage: true, caret: 'initial' });
  await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
  await expect
    .poll(
      async () => ((await (await page.request.get('/api/data')).json()) as AppData).settings.theme,
    )
    .toBe('light');
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator('h1')).toBeVisible();
    expect(
      await page.locator('body').evaluate((el) => el.scrollWidth <= window.innerWidth + 1),
      `${route} mobile overflow`,
    ).toBe(true);
  }
  await page.goto('/');
  await page.screenshot({ path: 'artifacts/dashboard-mobile.png', fullPage: true, caret: 'initial' });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Calendar', exact: true })
    .click();
  await expect(page).toHaveURL('/calendar');
  await expect(
    page.getByRole('button', { name: 'Close navigation', exact: true }).first(),
  ).toBeHidden();
  await page.getByRole('button', { name: 'Agenda', exact: true }).click();
  await expect(page.locator('.calendar-grid')).toHaveCount(0);
  await page.goto('/timer');
  await expect(page.getByRole('timer')).toBeVisible();
  await page.screenshot({ path: 'artifacts/timer-mobile.png', fullPage: true, caret: 'initial' });
  expect(errors).toEqual([]);
});
test('core pages meet automated WCAG A and AA checks', async ({ page }) => {
  await login(page);
  const issues: unknown[] = [];
  for (const route of [
    '/',
    '/homework/new',
    '/calendar',
    '/timetable/setup',
    '/subjects',
    '/timer',
    '/settings',
  ]) {
    await page.goto(route);
    await expect(page.locator('h1')).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    if (result.violations.length)
      issues.push({
        route,
        violations: result.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({ target: n.target, message: n.failureSummary })),
        })),
      });
  }
  await page.goto('/');
  await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
  await expect
    .poll(
      async () => ((await (await page.request.get('/api/data')).json()) as AppData).settings.theme,
    )
    .toBe('dark');
  for (const route of ['/', '/calendar', '/timer', '/settings']) {
    await page.goto(route);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    if (result.violations.length)
      issues.push({
        route: `${route} (dark)`,
        violations: result.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({ target: n.target, message: n.failureSummary })),
        })),
      });
  }
  await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
  await expect
    .poll(
      async () => ((await (await page.request.get('/api/data')).json()) as AppData).settings.theme,
    )
    .toBe('light');
  mkdirSync('artifacts', { recursive: true });
  writeFileSync('artifacts/accessibility.json', JSON.stringify(issues, null, 2));
  expect(issues).toEqual([]);
});
