import { requestIdSchema, reviewCommandSchema } from '@selvedge/contracts';
import { type BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from 'electron';

import type { RuntimeHost } from './runtime-host';

export function registerReviewIpc(
  host: RuntimeHost,
  assertSender: (event: IpcMainInvokeEvent) => void,
  getWindow: () => BrowserWindow | null,
) {
  ipcMain.handle('selvedge:branches', (event, input: unknown) => {
    assertSender(event);
    return host.getRepositoryBranches(requestIdSchema.parse(input));
  });
  ipcMain.handle('selvedge:import-skill', async (event) => {
    assertSender(event);
    const window = getWindow();
    if (!window) throw new Error('Dashboard is closed.');
    const result = await dialog.showOpenDialog(window, {
      title: 'Import review instructions from SKILL.md',
      properties: ['openFile'],
      filters: [{ name: 'Review skill', extensions: ['md'] }],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    assertSender(event);
    return host.importReviewSkill(result.filePaths[0]);
  });
  ipcMain.handle('selvedge:choose-repository', async (event) => {
    assertSender(event);
    const window = getWindow();
    if (!window) throw new Error('Dashboard is closed.');
    const result = await dialog.showOpenDialog(window, {
      title: 'Choose a local Git repository',
      properties: ['openDirectory'],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    assertSender(event);
    return host.addRepository(result.filePaths[0]);
  });
  ipcMain.handle('selvedge:reviews', (event) => {
    assertSender(event);
    return host.getReviews();
  });
  ipcMain.handle('selvedge:review', (event, input: unknown) => {
    assertSender(event);
    return host.startReview(reviewCommandSchema.parse(input));
  });
  ipcMain.handle('selvedge:cancel-review', (event, input: unknown) => {
    assertSender(event);
    return host.cancelReview(requestIdSchema.parse(input));
  });
}
