import assert from 'node:assert/strict';
import { cp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { ElectronApplication, Page } from 'playwright';

import {
  createReviewFixture,
  waitForPids,
} from '../../apps/desktop/src/tests/fixtures/review-fixture.ts';

type Fixture = Awaited<ReturnType<typeof createReviewFixture>>;

async function chooseSidebarOption(app: ElectronApplication, page: Page, action: string) {
  await app.evaluate(({ Menu, BrowserWindow }, selectedAction) => {
    const original = Object.getOwnPropertyDescriptor(Menu.prototype, 'popup');
    if (!original) throw new Error('Native menu popup is unavailable.');
    Menu.prototype.popup = function (options) {
      Object.defineProperty(Menu.prototype, 'popup', original);
      const item = this.getMenuItemById(selectedAction);
      if (!item) throw new Error('Sidebar option is missing.');
      // Simulate only the native selection; exercise the actual main/preload/UI wiring.
      const click: unknown = item.click;
      if (typeof click !== 'function') throw new Error('Sidebar option is not actionable.');
      const window = BrowserWindow.getFocusedWindow();
      Reflect.apply(click, item, [{}, window, window?.webContents]);
      options?.callback?.();
    };
  }, action);
  await page.getByRole('button', { name: 'Group and sort repositories' }).click();
}

export async function reviewFromDashboard(app: ElectronApplication, page: Page, fixture: Fixture) {
  // Let Electron's native theme drive CSS instead of Playwright's default light emulation.
  await page.emulateMedia({ colorScheme: null });
  await app.evaluate(({ nativeTheme }) => {
    nativeTheme.themeSource = 'light';
  });
  fixture.git('remote', 'add', 'origin', 'git@github.com:skein-js/repository.git');
  const secondary = join(fixture.directory, 'alpha');
  await cp(fixture.repository, secondary, { recursive: true });
  fixture.git(
    '-C',
    secondary,
    'remote',
    'set-url',
    'origin',
    'https://github.com/another-org/alpha.git',
  );
  for (const path of [fixture.repository, secondary]) {
    await app.evaluate(({ dialog }, selectedPath) => {
      dialog.showOpenDialog = () => Promise.resolve({ canceled: false, filePaths: [selectedPath] });
    }, path);
    await page.getByRole('button', { name: 'Add repository', exact: true }).click();
    await page.waitForFunction(
      (count) => document.querySelectorAll('[data-testid="repository-item"]').length === count,
      path === secondary ? 2 : 1,
    );
  }
  const sidebar = page.getByRole('navigation', { name: 'Repository browser' });
  await sidebar.getByText('skein-js', { exact: true }).waitFor();
  await sidebar.getByText('another-org', { exact: true }).waitFor();
  await chooseSidebarOption(app, page, 'group:repository');
  await chooseSidebarOption(app, page, 'sort:reverse');
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="repository-item"]')?.getAttribute('aria-label') ===
      'skein-js/repository',
  );
  await sidebar.getByRole('button', { name: 'skein-js/repository', exact: true }).click();
  await chooseSidebarOption(app, page, 'group:organization');
  const skillPath = join(fixture.provider, 'SKILL.md');
  await writeFile(skillPath, '# Arithmetic review\nCheck arithmetic correctness.\n');
  await app.evaluate(({ dialog }, path) => {
    dialog.showOpenDialog = () => Promise.resolve({ canceled: false, filePaths: [path] });
  }, skillPath);
  await page.getByRole('button', { name: 'Import SKILL.md', exact: true }).click();
  await page.waitForFunction(
    () =>
      document
        .querySelector<HTMLSelectElement>('#review-skill')
        ?.selectedOptions[0]?.textContent?.trim() === 'provider',
  );
  assert.equal(
    await page.getByLabel('Base branch', { exact: true }).inputValue(),
    'refs/heads/main',
  );
  assert.equal(
    await page.getByLabel('Review branch', { exact: true }).inputValue(),
    'refs/heads/feature/local-review',
  );
  await page.screenshot({ path: '.artifacts/branches-light.png', animations: 'disabled' });
  const lightBackground = await page
    .locator('app-root')
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  await app.evaluate(({ nativeTheme }) => {
    nativeTheme.themeSource = 'dark';
  });
  await page.waitForFunction(
    (background) =>
      window.matchMedia('(prefers-color-scheme: dark)').matches &&
      getComputedStyle(document.querySelector('app-root') ?? document.body).backgroundColor !==
        background,
    lightBackground,
  );
  await page.screenshot({ path: '.artifacts/branches-dark.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Run private review' }).click();
  await page.getByTestId('review-summary').waitFor();
  assert.equal(
    await page.getByTestId('review-summary').textContent(),
    'Manual review fixture — saved',
  );
  assert.equal(await page.getByTestId('review-status').textContent(), 'partial');
  const saved = sidebar.locator('button[data-review-id]').first();
  await page.getByRole('button', { name: 'New review', exact: true }).click();
  await page.getByLabel('Base branch', { exact: true }).waitFor();
  await saved.click();
  await page.getByTestId('review-summary').waitFor();
  assert.equal((await page.evaluate(() => window.selvedge.getReviews())).reviews.length, 1);
  await chooseSidebarOption(app, page, 'sort:name');
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="repository-item"]')?.getAttribute('aria-label') ===
      'another-org/alpha',
  );
  await sidebar
    .getByRole('button', { name: 'Toggle reviews in another-org/alpha', exact: true })
    .press('Space');
  await page.screenshot({
    path: '.artifacts/local-review-dark.png',
    fullPage: true,
    animations: 'disabled',
  });
  await app.evaluate(({ nativeTheme }) => {
    nativeTheme.themeSource = 'light';
  });
  await page.waitForFunction(
    (background) =>
      !window.matchMedia('(prefers-color-scheme: dark)').matches &&
      getComputedStyle(document.querySelector('app-root') ?? document.body).backgroundColor ===
        background,
    lightBackground,
  );
  await page.screenshot({
    path: '.artifacts/local-review.png',
    fullPage: true,
    animations: 'disabled',
  });
  await app.evaluate(({ nativeTheme }) => {
    nativeTheme.themeSource = 'system';
  });
}

export async function startHangingReview(page: Page, fixture: Fixture) {
  await rm(join(fixture.provider, 'pids.json'), { force: true });
  await writeFile(join(fixture.provider, 'mode'), 'hang');
  const id = await page.evaluate(async () => {
    const repository = (await window.selvedge.getReviews()).repositories[0];
    if (!repository) throw new Error('Selected repository was not retained.');
    const review = await window.selvedge.startReview({
      requestId: crypto.randomUUID(),
      repositoryId: repository.id,
      baseRef: 'HEAD~1',
      headRef: 'HEAD',
    });
    return review.id;
  });
  return { id, pids: await waitForPids(fixture.provider) };
}

export async function openDiagnostics(page: Page) {
  const details = page.locator('details.diagnostics');
  if ((await details.getAttribute('open')) === null)
    await details.getByText('Local runtime diagnostics', { exact: true }).click();
}
