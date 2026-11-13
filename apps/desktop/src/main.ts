import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { requestIdSchema } from '@selvedge/contracts';
import {
  app,
  BrowserWindow,
  ipcMain,
  type IpcMainInvokeEvent,
  Menu,
  nativeImage,
  nativeTheme,
  Tray,
} from 'electron';

import { isTrustedSender } from './ipc-security';
import { registerReviewIpc } from './review-ipc';
import { RuntimeHost } from './runtime-host';
import { registerSidebarMenu } from './sidebar-menu';

app.setName('Selvedge');
if (process.env['SELVEDGE_USER_DATA']) app.setPath('userData', process.env['SELVEDGE_USER_DATA']);
if (!app.requestSingleInstanceLock()) app.quit();
else
  void startDesktop().catch((error: unknown) => {
    console.error(error);
    app.exit(1);
  });

async function startDesktop() {
  await app.whenReady();
  const host = new RuntimeHost(join(import.meta.dirname, 'backend.js'), app.getPath('userData'));
  host.start();
  let window: BrowserWindow | null = null;
  let quitting = false;
  const backgroundColor = () => (nativeTheme.shouldUseDarkColors ? '#151b18' : '#f7f8f5');
  nativeTheme.on('updated', () => {
    if (window && !window.isDestroyed()) window.setBackgroundColor(backgroundColor());
  });
  const developmentUrl = !app.isPackaged ? process.env['SELVEDGE_RENDERER_URL'] : undefined;
  if (developmentUrl && developmentUrl !== 'http://127.0.0.1:4200') {
    throw new Error('The renderer development origin is not allowed.');
  }
  const page = join(import.meta.dirname, '../apps/renderer/browser/index.html');
  const expectedUrl = developmentUrl ? `${developmentUrl}/` : pathToFileURL(page).href;

  function showWindow() {
    if (window && !window.isDestroyed()) {
      window.show();
      window.focus();
      return;
    }
    const created = new BrowserWindow({
      title: 'Selvedge',
      width: 1040,
      height: 760,
      minWidth: 640,
      minHeight: 540,
      backgroundColor: backgroundColor(),
      show: false,
      webPreferences: {
        preload: join(import.meta.dirname, 'preload.cjs'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });
    window = created;
    created.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    created.webContents.on('will-navigate', (event, url) => {
      if (url !== expectedUrl) event.preventDefault();
    });
    created.webContents.on('will-attach-webview', (event) => event.preventDefault());
    created.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) =>
      callback(false),
    );
    created.webContents.session.setPermissionCheckHandler(() => false);
    created.webContents.session.webRequest.onBeforeRequest(
      {
        urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'],
      },
      (details, callback) => {
        const url = new URL(details.url);
        const developmentRequest =
          developmentUrl &&
          url.hostname === '127.0.0.1' &&
          url.port === '4200' &&
          (url.protocol === 'http:' || url.protocol === 'ws:');
        callback({ cancel: !developmentRequest });
      },
    );
    created.once('ready-to-show', () => created.show());
    created.once('closed', () => {
      if (window === created) window = null;
    });
    const loading = developmentUrl ? created.loadURL(expectedUrl) : created.loadFile(page);
    void loading.catch(() => app.exit(1));
  }

  function assertSender(event: IpcMainInvokeEvent) {
    if (
      !window ||
      !isTrustedSender(
        {
          contentsId: event.sender.id,
          topFrame: event.senderFrame === event.sender.mainFrame,
          url: event.senderFrame?.url ?? '',
        },
        { contentsId: window.webContents.id, url: expectedUrl },
      )
    ) {
      throw new Error('Untrusted renderer.');
    }
  }
  ipcMain.handle('selvedge:status', (event) => {
    assertSender(event);
    return host.getRuntimeStatus();
  });
  ipcMain.handle('selvedge:check', (event, input: unknown) => {
    assertSender(event);
    return host.runLocalCheck(requestIdSchema.parse(input));
  });
  registerReviewIpc(host, assertSender, () => window);
  registerSidebarMenu(assertSender, () => window);
  const icon = nativeImage.createFromPath(join(import.meta.dirname, 'tray.png'));
  if (process.platform === 'darwin') icon.setTemplateImage(true);
  const tray = new Tray(icon);
  tray.setToolTip('Selvedge');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open Selvedge', click: showWindow },
      { type: 'separator' },
      { label: 'Quit Selvedge', click: () => app.quit() },
    ]),
  );
  tray.on('click', showWindow);
  app.on('activate', showWindow);
  app.on('second-instance', showWindow);
  app.on('window-all-closed', () => {
    /* The tray keeps the application alive. */
  });
  app.on('before-quit', (event) => {
    if (quitting) return;
    event.preventDefault();
    quitting = true;
    void host.stop().finally(() => {
      tray.destroy();
      app.exit(0);
    });
  });
  showWindow();
}
