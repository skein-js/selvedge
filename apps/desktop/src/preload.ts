import { contextBridge, ipcRenderer } from 'electron';
import {
  checkResultSchema,
  requestIdSchema,
  runtimeStatusSchema,
  type SelvedgeApi,
} from '@selvedge/contracts';

const api: SelvedgeApi = {
  async getRuntimeStatus() {
    const result: unknown = await ipcRenderer.invoke('selvedge:status');
    return runtimeStatusSchema.parse(result);
  },
  async runLocalCheck(input) {
    const requestId = requestIdSchema.parse(input);
    const result: unknown = await ipcRenderer.invoke('selvedge:check', requestId);
    return checkResultSchema.parse(result);
  },
};

contextBridge.exposeInMainWorld('selvedge', api);
