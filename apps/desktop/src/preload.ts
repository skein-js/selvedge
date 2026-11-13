import {
  checkResultSchema,
  repositoryBranchesSchema,
  repositorySchema,
  requestIdSchema,
  reviewCommandSchema,
  reviewDashboardSchema,
  reviewSchema,
  runtimeStatusSchema,
  type SelvedgeApi,
  sidebarPreferencesSchema,
  skillSummarySchema,
} from '@selvedge/contracts';
import { contextBridge, ipcRenderer } from 'electron';

const api: SelvedgeApi = {
  async showSidebarOptions(input) {
    const value: unknown = await ipcRenderer.invoke(
      'selvedge:sidebar-options',
      sidebarPreferencesSchema.parse(input),
    );
    return sidebarPreferencesSchema.nullable().parse(value);
  },
  async getRuntimeStatus() {
    const result: unknown = await ipcRenderer.invoke('selvedge:status');
    return runtimeStatusSchema.parse(result);
  },
  async runLocalCheck(input) {
    const requestId = requestIdSchema.parse(input);
    const result: unknown = await ipcRenderer.invoke('selvedge:check', requestId);
    return checkResultSchema.parse(result);
  },
  async chooseRepository() {
    const value: unknown = await ipcRenderer.invoke('selvedge:choose-repository');
    return repositorySchema.nullable().parse(value);
  },
  async getReviews() {
    const value: unknown = await ipcRenderer.invoke('selvedge:reviews');
    return reviewDashboardSchema.parse(value);
  },
  async getRepositoryBranches(input) {
    const value: unknown = await ipcRenderer.invoke(
      'selvedge:branches',
      requestIdSchema.parse(input),
    );
    return repositoryBranchesSchema.parse(value);
  },
  async importReviewSkill() {
    const value: unknown = await ipcRenderer.invoke('selvedge:import-skill');
    return skillSummarySchema.nullable().parse(value);
  },
  async startReview(input) {
    const value: unknown = await ipcRenderer.invoke(
      'selvedge:review',
      reviewCommandSchema.parse(input),
    );
    return reviewSchema.parse(value);
  },
  async cancelReview(input) {
    const value: unknown = await ipcRenderer.invoke(
      'selvedge:cancel-review',
      requestIdSchema.parse(input),
    );
    if (value !== undefined) throw new Error('Invalid cancellation response.');
  },
};

contextBridge.exposeInMainWorld('selvedge', api);
