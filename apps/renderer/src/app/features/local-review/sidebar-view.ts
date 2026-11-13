import { sidebarPreferencesSchema } from '@selvedge/contracts';
import { z } from 'zod';

const key = 'selvedge.sidebar.v1';
const viewSchema = z.object({
  preferences: sidebarPreferencesSchema,
  repositoryId: z.union([z.uuid(), z.literal('')]),
  reviewId: z.union([z.uuid(), z.literal('')]),
  composing: z.boolean(),
  collapsedGroups: z.array(z.string().max(100)).max(1000),
  collapsedRepositories: z.array(z.uuid()).max(1000),
});
export type SidebarView = z.infer<typeof viewSchema>;

export function loadSidebarView(): SidebarView {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    const parsed = viewSchema.safeParse(value);
    if (parsed.success) return parsed.data;
  } catch {
    // A corrupt or unavailable preference store must not prevent local reviews.
  }
  return {
    preferences: { group: 'organization', sort: 'recent' },
    repositoryId: '',
    reviewId: '',
    composing: true,
    collapsedGroups: [],
    collapsedRepositories: [],
  };
}

export function saveSidebarView(value: SidebarView) {
  try {
    localStorage.setItem(key, JSON.stringify(viewSchema.parse(value)));
  } catch {
    // These are presentation preferences, not durable review records.
  }
}
