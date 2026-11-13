import { type SidebarPreferences, sidebarPreferencesSchema } from '@selvedge/contracts';
import { type BrowserWindow, ipcMain, type IpcMainInvokeEvent, Menu } from 'electron';

export function registerSidebarMenu(
  assertSender: (event: IpcMainInvokeEvent) => void,
  getWindow: () => BrowserWindow | null,
) {
  ipcMain.handle('selvedge:sidebar-options', (event, input: unknown) => {
    assertSender(event);
    const preferences = sidebarPreferencesSchema.parse(input);
    const window = getWindow();
    if (!window) throw new Error('Dashboard is closed.');
    return new Promise<SidebarPreferences | null>((resolve) => {
      const select = (patch: Partial<SidebarPreferences>) => {
        try {
          assertSender(event);
          resolve(sidebarPreferencesSchema.parse({ ...preferences, ...patch }));
        } catch {
          resolve(null);
        }
      };
      const menu = Menu.buildFromTemplate([
        { label: 'Group by', enabled: false },
        {
          id: 'group:organization',
          label: 'Organization / owner',
          type: 'radio',
          checked: preferences.group === 'organization',
          click: () => select({ group: 'organization' }),
        },
        {
          id: 'group:repository',
          label: 'Repository',
          type: 'radio',
          checked: preferences.group === 'repository',
          click: () => select({ group: 'repository' }),
        },
        { type: 'separator' },
        { label: 'Sort repositories by', enabled: false },
        {
          id: 'sort:name',
          label: 'Name A–Z',
          type: 'radio',
          checked: preferences.sort === 'name',
          click: () => select({ sort: 'name' }),
        },
        {
          id: 'sort:reverse',
          label: 'Name Z–A',
          type: 'radio',
          checked: preferences.sort === 'reverse',
          click: () => select({ sort: 'reverse' }),
        },
        {
          id: 'sort:recent',
          label: 'Recent review',
          type: 'radio',
          checked: preferences.sort === 'recent',
          click: () => select({ sort: 'recent' }),
        },
      ]);
      menu.popup({ window, callback: () => resolve(null) });
    });
  });
}
