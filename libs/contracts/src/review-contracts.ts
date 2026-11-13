import { z } from 'zod';

export const revisionSchema = z.string().regex(/^[a-f0-9]{40}([a-f0-9]{24})?$/);
export const refPattern = /^[A-Za-z0-9][A-Za-z0-9._/~^@{}+-]{0,199}$/;
export const branchRefSchema = z
  .string()
  .max(1000)
  .regex(/^refs\/(?:heads|remotes)\/[^\x00-\x20\x7f~^:?*\[\\]+$/)
  .refine(
    (value) =>
      !value.includes('..') &&
      !value.includes('@{') &&
      !value.endsWith('.') &&
      value
        .split('/')
        .every((part) => part.length > 0 && !part.startsWith('.') && !part.endsWith('.lock')),
  );
export const refSchema = z.union([z.string().regex(refPattern), branchRefSchema]);
export const repositoryBranchesSchema = z.strictObject({
  branches: z
    .array(z.strictObject({ ref: branchRefSchema, label: z.string().min(1).max(1000) }))
    .max(1000),
  currentRef: branchRefSchema.nullable(),
  defaultBaseRef: branchRefSchema.nullable(),
});
export type RepositoryBranches = z.infer<typeof repositoryBranchesSchema>;
export const sidebarPreferencesSchema = z.strictObject({
  group: z.enum(['organization', 'repository']),
  sort: z.enum(['name', 'reverse', 'recent']),
});
export type SidebarPreferences = z.infer<typeof sidebarPreferencesSchema>;
export const repositorySchema = z.strictObject({
  id: z.uuid(),
  label: z.string().max(240),
  organization: z.string().max(100).nullable().default(null),
});
export const defaultSkillId = '746a8fe1-7d49-464f-a683-414f1679ae05';
export const reviewSkillSchema = z.strictObject({
  id: z.uuid(),
  name: z.string().min(1).max(100),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
  instructions: z.string().min(1).max(16384),
});
export const skillSummarySchema = reviewSkillSchema.omit({ instructions: true });
export const reviewCommandSchema = z.strictObject({
  requestId: z.uuid(),
  repositoryId: z.uuid(),
  baseRef: refSchema,
  headRef: refSchema,
  skillId: z.uuid().default(defaultSkillId),
});
export const findingSchema = z.strictObject({
  severity: z.enum(['high', 'medium', 'low']),
  file: z.string().min(1).max(1000),
  side: z.enum(['before', 'after']),
  startLine: z.number().int().min(1),
  endLine: z.number().int().min(1),
  explanation: z.string().min(1).max(4000),
  suggestion: z.string().min(1).max(4000),
});
export const agentResultSchema = z.strictObject({
  summary: z.string().min(1).max(4000),
  findings: z.array(findingSchema).max(50),
});
export const targetSchema = z.strictObject({
  baseSha: revisionSchema,
  headSha: revisionSchema,
  mergeBaseSha: revisionSchema,
});
export const bundleSchema = z.strictObject({
  target: targetSchema,
  skill: reviewSkillSchema.optional(),
  files: z
    .array(
      z.strictObject({
        path: z.string().min(1).max(1000),
        before: z.string().max(32768),
        after: z.string().max(32768),
      }),
    )
    .max(20),
  exclusions: z
    .array(z.strictObject({ path: z.string().max(1000), reason: z.string().max(120) }))
    .max(1000),
});
export const reviewSchema = z.strictObject({
  id: z.uuid(),
  repository: repositorySchema,
  baseRef: refSchema,
  headRef: refSchema,
  target: targetSchema.nullable(),
  status: z.enum([
    'preparing',
    'running',
    'cancelling',
    'completed',
    'partial',
    'cancelled',
    'interrupted',
    'failed',
  ]),
  createdAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
  result: agentResultSchema.nullable(),
  exclusions: bundleSchema.shape.exclusions,
  error: z.string().max(500).nullable(),
  codexVersion: z.string().nullable(),
  skill: skillSummarySchema.optional(),
});
export const reviewDashboardSchema = z.strictObject({
  repositories: z.array(repositorySchema),
  reviews: z.array(reviewSchema),
  skills: z.array(skillSummarySchema),
  reviewer: z.strictObject({
    available: z.boolean(),
    version: z.string().nullable(),
    error: z.string().nullable(),
  }),
});
export type ReviewCommand = z.infer<typeof reviewCommandSchema>;
export type Review = z.infer<typeof reviewSchema>;
export type ReviewBundle = z.infer<typeof bundleSchema>;
export type AgentResult = z.infer<typeof agentResultSchema>;
export type ReviewDashboard = z.infer<typeof reviewDashboardSchema>;
export type ReviewSkill = z.infer<typeof reviewSkillSchema>;
export type SkillSummary = z.infer<typeof skillSummarySchema>;
export type Repository = z.infer<typeof repositorySchema>;

export function isReviewActive(review: Pick<Review, 'status'>): boolean {
  return ['preparing', 'running', 'cancelling'].includes(review.status);
}

export interface LocalReviewApi {
  showSidebarOptions(preferences: SidebarPreferences): Promise<SidebarPreferences | null>;
  chooseRepository(): Promise<z.infer<typeof repositorySchema> | null>;
  importReviewSkill(): Promise<SkillSummary | null>;
  getReviews(): Promise<ReviewDashboard>;
  getRepositoryBranches(repositoryId: string): Promise<RepositoryBranches>;
  startReview(command: z.input<typeof reviewCommandSchema>): Promise<Review>;
  cancelReview(id: string): Promise<void>;
}
