import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import type { RuntimeStatus } from '@selvedge/contracts';

@Component({
  selector: 'app-runtime-check',
  imports: [ButtonModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section
    class="runtime-card"
    aria-labelledby="runtime-heading"
    [attr.aria-busy]="checking()"
  >
    <div class="card-heading">
      <div>
        <h2 id="runtime-heading">Local runtime</h2>
      </div>
      <span class="status" [class.error]="status().status === 'error'" role="status">
        <span class="status-dot"></span>{{ checking() ? 'Checking' : statusLabel() }}
      </span>
    </div>
    <p class="card-description">Verify local persistence without credentials.</p>
    <div class="checkpoint">
      <span class="checkpoint-icon" aria-hidden="true">↳</span>
      <div>
        <p class="small-label">LAST SUCCESSFUL CHECK</p>
        <p class="saved-value" data-testid="last-check">
          @if (status().lastCheckAt; as timestamp) {
            {{ timestamp | date: 'medium' }}
          } @else {
            No checks yet
          }
        </p>
        <p class="saved-note">
          {{
            status().lastCheckAt
              ? 'Saved on this device. Retained across restarts.'
              : 'Your first result will appear here.'
          }}
        </p>
      </div>
    </div>
    @if (status().error; as error) {
      <p class="error-message" role="alert">{{ error }}</p>
    }
    <div class="card-actions">
      <p-button
        size="small"
        label="Run local check"
        [loading]="checking()"
        [disabled]="status().status !== 'ready' || checking()"
        (onClick)="runCheck()"
      />
      <span>Stays on your machine</span>
    </div>
  </section>`,
  styles: `
    .card-heading,
    .card-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .runtime-card {
      background: var(--selvedge-panel);
      border: 1px solid var(--selvedge-border);
      border-radius: 3px;
      padding: 14px;
    }
    .small-label {
      color: var(--selvedge-muted);
      font-size: 9px;
      margin: 0 0 7px;
      letter-spacing: 1.3px;
      font-weight: 600;
    }
    h2 {
      font-size: 14px;
      font-weight: 550;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .status {
      display: flex;
      align-items: center;
      gap: 7px;
      color: var(--selvedge-success);
      background: var(--selvedge-success-surface);
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 11px;
    }
    .status-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: currentColor;
    }
    .card-description {
      color: var(--selvedge-muted);
      font-size: 12px;
      margin: 18px 0 23px;
    }
    .checkpoint {
      display: flex;
      gap: 16px;
      padding: 21px 0;
      border-block: 1px solid var(--selvedge-divider);
    }
    .checkpoint-icon {
      font-size: 24px;
      color: var(--selvedge-muted);
    }
    .saved-value {
      font-size: 14px;
      margin: 0 0 5px;
    }
    .saved-note {
      font-size: 11px;
      color: var(--selvedge-muted);
      margin: 0;
    }
    .card-actions {
      padding-top: 23px;
      gap: 14px;
    }
    .card-actions > span {
      font-size: 10px;
      color: var(--selvedge-muted);
    }
    .error,
    .error-message {
      color: var(--selvedge-danger);
    }
    .error-message {
      font-size: 12px;
      line-height: 1.6;
    }
    @media (max-width: 700px) {
      .runtime-card {
        padding: 12px;
      }
      .card-actions {
        flex-wrap: wrap;
      }
    }
  `,
})
export class RuntimeCheck {
  readonly status = signal<RuntimeStatus>({ status: 'starting', lastCheckAt: null, error: null });
  readonly checking = signal(false);
  private refreshing = false;
  private checkRevision = 0;
  readonly statusLabel = computed(
    () =>
      ({ starting: 'Starting', ready: 'Ready', error: 'Needs attention' })[this.status().status],
  );

  constructor() {
    void this.refresh();
    const interval = setInterval(() => {
      if (!this.checking()) void this.refresh();
    }, 5000);
    inject(DestroyRef).onDestroy(() => clearInterval(interval));
  }

  private async refresh() {
    if (this.refreshing || this.checking()) return;
    this.refreshing = true;
    const revision = this.checkRevision;
    try {
      const latest = await window.selvedge.getRuntimeStatus();
      if (revision !== this.checkRevision) return;
      this.status.update((previous) => ({
        ...latest,
        lastCheckAt:
          latest.status === 'ready'
            ? latest.lastCheckAt
            : (latest.lastCheckAt ?? previous.lastCheckAt),
      }));
    } catch {
      if (revision === this.checkRevision)
        this.fail('The local runtime is unavailable. Restart Selvedge to try again.');
    } finally {
      this.refreshing = false;
    }
  }

  async runCheck() {
    if (this.checking() || this.status().status !== 'ready') return;
    this.checkRevision++;
    this.checking.set(true);
    try {
      const result = await window.selvedge.runLocalCheck(crypto.randomUUID());
      this.status.set({ status: 'ready', lastCheckAt: result.lastCheckAt, error: null });
    } catch {
      this.fail('The check could not finish. Wait for recovery, then run a new check.');
    } finally {
      this.checking.set(false);
    }
  }

  private fail(error: string) {
    this.status.update((state) => ({ ...state, status: 'error', error }));
  }
}
