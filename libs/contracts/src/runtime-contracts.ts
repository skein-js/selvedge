import { z } from 'zod';

import {
  type LocalReviewApi,
  repositoryBranchesSchema,
  repositorySchema,
  reviewCommandSchema,
  reviewDashboardSchema,
  reviewSchema,
  skillSummarySchema,
} from './review-contracts';

export const requestIdSchema = z.uuid();
export const runtimeStatusSchema = z.strictObject({
  status: z.enum(['starting', 'ready', 'error']),
  lastCheckAt: z.iso.datetime().nullable(),
  error: z.string().max(240).nullable(),
});
export const checkResultSchema = z.strictObject({
  lastCheckAt: z.iso.datetime(),
  runId: z.uuid(),
});
export const backendRequestSchema = z.discriminatedUnion('operation', [
  z.strictObject({ operation: z.literal('status'), id: requestIdSchema }),
  z.strictObject({
    operation: z.literal('check'),
    id: requestIdSchema,
    requestId: requestIdSchema,
  }),
  z.strictObject({ operation: z.literal('shutdown'), id: requestIdSchema }),
  z.strictObject({
    operation: z.literal('repository'),
    id: requestIdSchema,
    path: z.string().min(1).max(4000),
  }),
  z.strictObject({ operation: z.literal('reviews'), id: requestIdSchema }),
  z.strictObject({
    operation: z.literal('branches'),
    id: requestIdSchema,
    repositoryId: requestIdSchema,
  }),
  z.strictObject({
    operation: z.literal('import-skill'),
    id: requestIdSchema,
    path: z.string().min(1).max(4000),
  }),
  z.strictObject({
    operation: z.literal('review'),
    id: requestIdSchema,
    command: reviewCommandSchema,
  }),
  z.strictObject({
    operation: z.literal('cancel-review'),
    id: requestIdSchema,
    reviewId: requestIdSchema,
  }),
]);
export const backendResponseSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('ready') }),
  z.strictObject({
    type: z.literal('result'),
    id: requestIdSchema,
    result: z.union([
      runtimeStatusSchema,
      checkResultSchema,
      repositorySchema,
      reviewDashboardSchema,
      reviewSchema,
      skillSummarySchema,
      repositoryBranchesSchema,
      z.null(),
    ]),
  }),
  z.strictObject({ type: z.literal('error'), id: requestIdSchema, message: z.string().max(240) }),
]);

export type RuntimeStatus = z.infer<typeof runtimeStatusSchema>;
export type CheckResult = z.infer<typeof checkResultSchema>;
export type BackendRequest = z.infer<typeof backendRequestSchema>;
export type BackendResponse = z.infer<typeof backendResponseSchema>;

export interface SelvedgeApi extends LocalReviewApi {
  getRuntimeStatus(): Promise<RuntimeStatus>;
  runLocalCheck(requestId: string): Promise<CheckResult>;
}
