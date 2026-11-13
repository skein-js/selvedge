import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import type { RuntimeStatus } from '@selvedge/contracts';
import { _electron as electron, type ElectronApplication, type Page } from 'playwright';
import { packagedApp, directoryBytes } from './packaged-app.ts';

const { directory, executable } = await packagedApp();
const data = await mkdtemp(join(tmpdir(), 'selvedge-smoke-'));
await mkdir('.artifacts', { recursive: true });
let application: ElectronApplication | undefined;

async function launch() {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) if (value !== undefined) env[key] = value;
  delete env['ELECTRON_RUN_AS_NODE'];
  env['SELVEDGE_USER_DATA'] = data;
  const startedAt = performance.now();
  const app = await electron.launch({ executablePath: executable, env, timeout: 15_000 });
  application = app;
  const page = await app.firstWindow();
  page.on('pageerror', (error) => console.error(error));
  const runtime = await waitForRuntime(page, (state) => state.status === 'ready');
  return { app, page, runtime, startupMs: Math.round(performance.now() - startedAt) };
}

async function memory(app: ElectronApplication) {
  return app.evaluate(({ app }) => ({
    totalMiB: app
      .getAppMetrics()
      .reduce((sum, metric) => sum + metric.memory.workingSetSize / 1024, 0),
    processes: app.getAppMetrics().map((metric) => ({
      type: metric.type,
      name: metric.name,
      workingSetMiB: metric.memory.workingSetSize / 1024,
    })),
  }));
}

async function status(page: Page) {
  return page.evaluate(() => window.selvedge.getRuntimeStatus());
}

async function waitForRuntime(page: Page, predicate: (state: RuntimeStatus) => boolean) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const current = await status(page);
      if (predicate(current)) return current;
    } catch {
      /* A restarting utility can reject its outstanding requests. */
    }
    await delay(50);
  }
  throw new Error('The runtime did not reach the expected state.');
}

async function killBackend(app: ElectronApplication) {
  return app.evaluate(({ app }) => {
    const processInfo = app.getAppMetrics().find((item) => item.name === 'Selvedge local runtime');
    if (!processInfo) throw new Error('Runtime process not found.');
    process.kill(processInfo.pid, 'SIGKILL');
    return processInfo.pid;
  });
}

try {
  const first = await launch();
  assert.equal(first.runtime.lastCheckAt, null);
  await first.page.getByRole('button', { name: 'Run local check' }).click();
  const { lastCheckAt: retained } = await waitForRuntime(
    first.page,
    (state) => state.lastCheckAt !== null,
  );
  await first.page.waitForFunction(() => {
    const value = document.querySelector('[data-testid="last-check"]')?.textContent?.trim();
    return value && value !== 'No checks yet';
  });
  const displayedCheck = await first.page.getByTestId('last-check').textContent();
  const malformedRejected = await first.page.evaluate(async () => {
    try {
      await window.selvedge.runLocalCheck('../../untrusted');
      return false;
    } catch {
      return true;
    }
  });
  assert.equal(malformedRejected, true);
  assert.equal(await first.page.evaluate(() => typeof Reflect.get(window, 'require')), 'undefined');
  const foreignWindowRejected = await first.app.evaluate(async ({ app, BrowserWindow }) => {
    const secondary = new BrowserWindow({
      show: false,
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        preload: `${app.getAppPath()}/dist/desktop/preload.cjs`,
      },
    });
    try {
      await secondary.loadFile(`${app.getAppPath()}/dist/apps/renderer/browser/index.html`);
      const rejected: unknown = await secondary.webContents.executeJavaScript(
        'window.selvedge.getRuntimeStatus().then(() => false, () => true)',
      );
      return rejected === true;
    } finally {
      secondary.destroy();
    }
  });
  assert.equal(foreignWindowRejected, true);
  await first.page.screenshot({ path: '.artifacts/desktop.png' });
  const dashboard = await memory(first.app);
  await first.page.close();
  assert.equal(
    await first.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length),
    0,
  );
  const tray = await memory(first.app);
  await first.app.evaluate(({ app }) => app.emit('activate'));
  const reopened = await first.app.firstWindow();
  await reopened.waitForFunction(
    (expected) => document.querySelector('[data-testid="last-check"]')?.textContent === expected,
    displayedCheck,
  );
  const firstPid = await killBackend(first.app);
  await first.app.evaluate(async ({ app }, previousPid) => {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (
        app
          .getAppMetrics()
          .some((item) => item.name === 'Selvedge local runtime' && item.pid !== previousPid)
      )
        return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('The utility process was not replaced.');
  }, firstPid);
  await waitForRuntime(
    reopened,
    (state) => state.status === 'ready' && state.lastCheckAt === retained,
  );
  await killBackend(first.app);
  await waitForRuntime(reopened, (state) => state.status === 'error');
  await reopened.getByRole('alert').waitFor();
  assert.equal(await reopened.getByTestId('last-check').textContent(), displayedCheck);
  await first.app.close();
  application = undefined;
  const second = await launch();
  assert.equal(second.runtime.lastCheckAt, retained);
  const liveShutdownStarted = performance.now();
  await second.app.close();
  assert.ok(
    performance.now() - liveShutdownStarted < 5000,
    'Live runtime shutdown exceeded five seconds',
  );
  application = undefined;
  const measurements = {
    measuredAt: new Date().toISOString(),
    platform: process.platform,
    architecture: process.arch,
    startupMs: first.startupMs,
    dashboard,
    tray,
    bundleBytes: await directoryBytes(directory),
    note: 'Single unsigned packaged sample; process working sets may include shared pages. No reviewer process is running.',
  };
  await writeFile('.artifacts/measurements.json', `${JSON.stringify(measurements, null, 2)}\n`);
  console.log('PACKAGED_SMOKE_OK', JSON.stringify(measurements));
} finally {
  await application?.close();
  await rm(data, { recursive: true, force: true });
}
