import { ChangeDetectionStrategy, Component } from '@angular/core';

import { LocalReview } from './features/local-review/local-review';

@Component({
  selector: 'app-root',
  imports: [LocalReview],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="titlebar">
      <div>
        <span class="mark" aria-hidden="true">s</span><strong>Selvedge</strong
        ><span class="separator">/</span><span>Local reviews</span>
      </div>
      <span class="preview">Developer preview</span>
    </header>
    <app-local-review />
    <footer><span>Private local history</span><span>Codex CLI · Skein</span></footer>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100dvh;
      color: var(--selvedge-ink);
      background: var(--selvedge-panel);
      font-size: 12px;
    }
    .titlebar {
      display: flex;
      flex: 0 0 44px;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 0 14px;
      border-bottom: 1px solid var(--selvedge-border);
      background: var(--selvedge-canvas);
    }
    .titlebar > div {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .mark {
      display: grid;
      place-items: center;
      width: 21px;
      height: 21px;
      border-radius: 4px;
      background: var(--selvedge-accent);
      color: var(--selvedge-on-accent);
      font:
        italic 20px Georgia,
        serif;
    }
    .separator,
    .preview {
      color: var(--selvedge-muted);
    }
    app-local-review {
      flex: 1;
      min-height: 0;
    }
    footer {
      display: flex;
      justify-content: space-between;
      flex: 0 0 24px;
      align-items: center;
      padding: 0 12px;
      border-top: 1px solid var(--selvedge-border);
      background: var(--selvedge-canvas);
      color: var(--selvedge-muted);
      font-size: 10px;
    }
    @media (max-width: 600px) {
      .preview {
        display: none;
      }
    }
  `,
})
export class App {}
