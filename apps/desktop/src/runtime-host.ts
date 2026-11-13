import { randomUUID } from 'node:crypto';

import {
  type BackendRequest,
  backendResponseSchema,
  checkResultSchema,
  repositoryBranchesSchema,
  repositorySchema,
  type ReviewCommand,
  reviewDashboardSchema,
  reviewSchema,
  type RuntimeStatus,
  runtimeStatusSchema,
  skillSummarySchema,
} from '@selvedge/contracts';
import { type UtilityProcess, utilityProcess } from 'electron';

interface Pending {
  resolve(value: unknown): void;
  reject(error: Error): void;
  timer: ReturnType<typeof setTimeout>;
}

export class RuntimeHost {
  private child: UtilityProcess | undefined;
  private ready = false;
  private stopping = false;
  private restarted = false;
  private failed = false;
  private readonly pending = new Map<string, Pending>();

  constructor(
    private readonly entry: string,
    private readonly dataDirectory: string,
  ) {}

  start(): void {
    if (this.child || this.stopping) return;
    this.ready = false;
    const child = utilityProcess.fork(this.entry, [], {
      serviceName: 'Selvedge local runtime',
      // Development bundles are unsigned; the utility hosts the native SQLite addon.
      allowLoadingUnsignedLibraries: true,
      env: {
        ...process.env,
        SELVEDGE_DATA_DIRECTORY: this.dataDirectory,
        SELVEDGE_NODE_EXECUTABLE: process.execPath,
        LANGSMITH_TRACING: 'false',
        LANGCHAIN_TRACING_V2: 'false',
      },
      stdio: 'pipe',
    });
    this.child = child;
    child.stdout?.on('data', () => {
      /* Drain without retaining unbounded output. */
    });
    child.stderr?.on('data', (data: Buffer) => process.stderr.write(data));
    const startup = setTimeout(() => child.kill(), 10_000);
    child.on('message', (input: unknown) => {
      const parsed = backendResponseSchema.safeParse(input);
      if (!parsed.success) {
        child.kill();
        return;
      }
      const message = parsed.data;
      if (message.type === 'ready') {
        clearTimeout(startup);
        this.ready = true;
        this.failed = false;
        return;
      }
      const pending = this.pending.get(message.id);
      if (!pending) return;
      clearTimeout(pending.timer);
      this.pending.delete(message.id);
      if (message.type === 'result') pending.resolve(message.result);
      else pending.reject(new Error(message.message));
    });
    child.once('exit', () => {
      clearTimeout(startup);
      this.ready = false;
      this.child = undefined;
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error('Local runtime stopped. Run a new check after recovery.'));
      }
      this.pending.clear();
      if (!this.stopping && !this.restarted) {
        this.restarted = true;
        this.start();
      } else if (!this.stopping) this.failed = true;
    });
  }

  async getRuntimeStatus(): Promise<RuntimeStatus> {
    if (!this.ready)
      return {
        status: this.failed ? 'error' : 'starting',
        lastCheckAt: null,
        error: this.failed ? 'The local runtime stopped. Restart Selvedge to try again.' : null,
      };
    return runtimeStatusSchema.parse(await this.request({ operation: 'status', id: randomUUID() }));
  }

  async runLocalCheck(requestId: string) {
    return checkResultSchema.parse(
      await this.request({ operation: 'check', id: randomUUID(), requestId }),
    );
  }

  async addRepository(path: string) {
    return repositorySchema.parse(
      await this.request({ operation: 'repository', id: randomUUID(), path }),
    );
  }

  async getReviews() {
    return reviewDashboardSchema.parse(
      await this.request({ operation: 'reviews', id: randomUUID() }),
    );
  }

  async getRepositoryBranches(repositoryId: string) {
    return repositoryBranchesSchema.parse(
      await this.request({ operation: 'branches', id: randomUUID(), repositoryId }),
    );
  }

  async importReviewSkill(path: string) {
    return skillSummarySchema.parse(
      await this.request({ operation: 'import-skill', id: randomUUID(), path }),
    );
  }

  async startReview(command: ReviewCommand) {
    return reviewSchema.parse(
      await this.request({ operation: 'review', id: randomUUID(), command }),
    );
  }

  async cancelReview(reviewId: string) {
    await this.request({ operation: 'cancel-review', id: randomUUID(), reviewId });
  }

  private request(request: BackendRequest): Promise<unknown> {
    if (!this.child || !this.ready || this.stopping)
      return Promise.reject(new Error('Local runtime is not ready.'));
    const child = this.child;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(request.id);
        reject(new Error('The local runtime request timed out. Run a new check after recovery.'));
        child.kill();
      }, 10_000);
      this.pending.set(request.id, { resolve, reject, timer });
      try {
        child.postMessage(request);
      } catch {
        clearTimeout(timer);
        this.pending.delete(request.id);
        reject(new Error('The local runtime connection failed. Wait for recovery and try again.'));
        child.kill();
      }
    });
  }

  async stop(): Promise<void> {
    this.stopping = true;
    this.ready = false;
    const child = this.child;
    if (!child) return;
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        child.kill();
        resolve();
      }, 4500);
      child.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
      try {
        child.postMessage({ operation: 'shutdown', id: randomUUID() });
      } catch {
        child.kill();
      }
    });
  }
}
