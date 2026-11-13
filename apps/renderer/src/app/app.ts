import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RuntimeCheck } from './features/runtime-check/runtime-check';

@Component({
  selector: 'app-root',
  imports: [RuntimeCheck],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="workspace min-h-screen">
      <header>
        <div class="brand"><span class="mark" aria-hidden="true">s</span> Selvedge</div>
        <span class="edition">LOCAL FIRST <span class="edition-dot"></span> FOUNDATION</span>
      </header>
      <main>
        <p class="eyebrow">CATCH THE LOOSE ENDS BEFORE THEY UNRAVEL</p>
        <h1>A little certainty.<br /><span>Right on your desktop.</span></h1>
        <p class="introduction">
          Your private review workspace starts here. Run a local check to confirm Selvedge can save
          its work and pick up where it left off.
        </p>
        <app-runtime-check />
        <p class="privacy-note">
          <span aria-hidden="true">◈</span> Nothing leaves this device during this check.
        </p>
      </main>
      <footer>
        <span>BUILT TO KEEP THE THREAD</span><span>Electron <i>·</i> Skein <i>·</i> SQLite</span>
      </footer>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .workspace {
      color: var(--selvedge-ink);
      background: var(--selvedge-canvas);
      padding: 28px 48px 22px;
    }
    header,
    footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 11px;
      font-size: 20px;
      font-weight: 650;
      letter-spacing: -0.6px;
    }
    .mark {
      background: var(--selvedge-accent);
      color: var(--selvedge-panel);
      height: 31px;
      width: 31px;
      display: grid;
      place-items: center;
      border-radius: 9px;
      font:
        italic 28px Georgia,
        serif;
    }
    .edition,
    .small-label,
    .eyebrow,
    footer {
      font-size: 10px;
      letter-spacing: 1.5px;
      font-weight: 600;
    }
    .edition {
      display: flex;
      align-items: center;
      gap: 9px;
      color: var(--selvedge-muted);
    }
    .edition-dot {
      width: 3px;
      height: 3px;
      background: var(--selvedge-muted);
      border-radius: 50%;
    }
    main {
      max-width: 650px;
      margin: 40px auto 28px;
    }
    .eyebrow {
      color: var(--selvedge-muted);
      margin-bottom: 20px;
      font-size: 9px;
    }
    h1 {
      font-size: clamp(30px, 4vw, 44px);
      font-weight: 550;
      line-height: 1.13;
      letter-spacing: -1.8px;
      margin: 0 0 18px;
    }
    h1 span {
      color: var(--selvedge-muted);
    }
    .introduction {
      font-size: 14px;
      line-height: 1.8;
      color: var(--selvedge-muted);
      max-width: 470px;
      margin-bottom: 30px;
    }
    .privacy-note {
      margin-top: 20px;
      text-align: center;
      color: var(--selvedge-muted);
      font-size: 10px;
    }
    .privacy-note span {
      margin-right: 5px;
    }
    footer {
      color: var(--selvedge-muted);
      font-size: 9px;
      letter-spacing: 1px;
      max-width: 1120px;
      margin: auto;
    }
    footer i {
      font-style: normal;
      margin: 0 8px;
      color: var(--selvedge-muted);
    }
    @media (max-width: 700px) {
      .workspace {
        padding: 22px;
      }
      main {
        margin-top: 46px;
      }
      .edition {
        display: none;
      }
      footer {
        letter-spacing: 0.4px;
      }
    }
  `,
})
export class App {}
