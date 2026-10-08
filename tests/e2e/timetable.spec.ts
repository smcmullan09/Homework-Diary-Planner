import { test, expect } from '@playwright/test';
import type { AppData } from '../../src/lib/types';

test('custom day periods, overlap validation and copying persist correctly', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email address', { exact: true }).fill(process.env.OWNER_EMAIL!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.OWNER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL('/');
  const initial = (await (await page.request.get('/api/data')).json()) as AppData;
  const origin = new URL(process.env.APP_URL || 'http://127.0.0.1:3000').origin;
  try {
    // Use an empty Saturday for this test and restore the exact original schedule afterwards.
    const days = initial.days.filter((d) => d.weekday !== 6);
    const response = await page.request.put('/api/timetable', {
      headers: { Origin: origin },
      data: [...days, { weekday: 6, enabled: true, periods: [] }],
    });
    expect(response.ok()).toBe(true);
    await page.goto('/timetable/setup');
    const saturday = page
      .locator('.timetable-column')
      .filter({ has: page.getByRole('heading', { name: 'Saturday', exact: true }) });
    await saturday.getByRole('button', { name: 'Quick build', exact: true }).click();
    await page.getByLabel('Start time', { exact: true }).fill('07:00');
    await page.getByLabel('Number of lessons').fill('9');
    await page.getByLabel('Lesson length (minutes)').fill('25');
    await page.getByLabel('Break between lessons (minutes)').fill('5');
    await page.getByRole('button', { name: 'Build periods', exact: true }).click();
    await expect(saturday.locator('.period-card')).toHaveCount(17);
    await saturday.locator('.period-card').first().click();
    await page.getByLabel('Period name', { exact: true }).fill('Independent study');
    await page.getByLabel('Type', { exact: true }).selectOption('STUDY');
    await page.getByLabel('Custom label (optional)').fill('Morning reading');
    await page.getByLabel('Room (optional)').fill('Library');
    await page.getByRole('button', { name: 'Save period', exact: true }).click();
    await expect(saturday.getByText('Morning reading', { exact: true })).toBeVisible();
    await saturday.getByRole('button', { name: 'Add period', exact: true }).click();
    await page.getByLabel('Start time', { exact: true }).fill('07:10');
    await page.getByLabel('End time', { exact: true }).fill('07:20');
    await page.getByRole('button', { name: 'Save period', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('cannot overlap');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await saturday.getByRole('button', { name: 'Copy Saturday', exact: true }).click();
    await page.getByLabel('Copy to', { exact: true }).selectOption('7');
    await page.getByRole('button', { name: 'Copy day', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect
      .poll(
        async () =>
          ((await (await page.request.get('/api/data')).json()) as AppData).days.find(
            (d) => d.weekday === 7,
          )?.periods.length,
      )
      .toBe(17);
    await page.reload();
    const result = (await (await page.request.get('/api/data')).json()) as AppData;
    expect(result.days.find((d) => d.weekday === 6)?.periods[0].name).toBe('Independent study');
    expect(result.days.find((d) => d.weekday === 7)?.periods[0].label).toBe('Morning reading');
    expect(result.days.find((d) => d.weekday === 7)?.enabled).toBe(true);
    await page.screenshot({ path: 'artifacts/custom-timetable-desktop.png', fullPage: true, caret: 'initial' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .locator('.mobile-day-tabs')
      .getByRole('button', { name: 'Sat', exact: true })
      .click();
    await expect(saturday.getByText('Morning reading', { exact: true })).toBeVisible();
    expect(await page.locator('body').evaluate((el) => el.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await page.screenshot({ path: 'artifacts/custom-timetable-mobile.png', fullPage: true, caret: 'initial' });
  } finally {
    const response = await page.request.put('/api/timetable', {
      headers: { Origin: origin },
      data: initial.days,
    });
    expect(response.ok()).toBe(true);
  }
});
