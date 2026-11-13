# Selvedge

_Catch the loose ends before they unravel._

Selvedge is a planned open-source, local-first pull request watcher powered by
[Skein-JS](https://skein.js.org/). It will monitor selected GitHub repositories,
delegate reviews to your chosen coding agent, and keep findings connected to the
exact commits they describe.

Reviews arrive in a private desktop inbox. Inspect findings, follow them across
updates, and choose what to publish to GitHub.

## Project status

**Manual local-review preview.** Choose a local Git repository and committed
base/head references, then run a private review using **Codex CLI 0.167.0**.
Findings include severity, file/side/line references, explanations, suggestions,
exact SHAs, and coverage exclusions. Results and history survive restarts.
GitHub monitoring, Claude Code, finding tracking across commits, and publication
remain planned. There is no end-user release or installer.

The Electron/Angular desktop uses secure IPC and embedded Skein/SQLite. One review
runs at a time with bounded source context and no repository scripts or source
edits. Repeating a request reuses its stored attempt; interruptions never trigger
automatic paid retries. Closing the dashboard leaves active work in the tray;
Quit cancels it. A credential-free local diagnostic is also available.

The compact desktop workspace groups repositories by organization/owner or as a
flat list, with name and recent-review sorting. Labels come from local GitHub
origin URLs; no GitHub account or network lookup is needed. Expand a repository to
open its saved reviews, use the native **Group and sort** menu to organize the
sidebar, or choose **New review** to open a draft. View selection and collapsed
sections survive reopening the dashboard.

Import a local **SKILL.md** to customize review guidance, select it for an attempt,
then edit and reimport it when needed. Each attempt retains the exact instructions
and hash. Skills supply instructions only; linked scripts, tools, and resources
are not loaded. The built-in **General review** works without importing a file.

Install Git and the supported Codex CLI, run `codex login` outside Selvedge, and
restart the application. Choose a repository, select **Base branch** and **Review
branch**, and select **Run private review**. The selectors default to the known
default/main branch and checked-out branch. Only committed changes from the
merge base to head are supplied. Missing/unsupported installations disable Run.
For GUI PATH issues, set `SELVEDGE_CODEX_PATH` to an absolute native Codex executable
or installed JavaScript entry before launch. Windows shell wrappers are not used.

The desktop follows your OS light/dark appearance automatically, including native
controls and menus. Branch choices include local and already-fetched remote branches;
selection never fetches or checks out code. Use **Refresh branches** after changes
in your Git client.

The [manual-review contract](docs/manual-local-review.md) explains the fixed safety
profile and preview limits: 20 text files, 128 KiB total source, five-minute review
deadline, and 50 retained attempts. Local packaged verification covers macOS
ARM64, including one approved synthetic review with the actual CLI and existing
login. This new adapter's Windows/Linux and broader account-policy gates are separate.

## Planned experience

1. Connect GitHub and select repositories to monitor.
2. Choose an existing Codex CLI or Claude Code installation.
3. Receive private reviews when eligible pull requests open or change.
4. Track outstanding findings and inspect evidence of possible fixes.
5. Publish selected findings to GitHub only after approving the preview.

The MVP will support configurable polling, review policies, concurrency limits,
native notifications, cancellation, and recovery after interrupted work.

## How it works

Electron provides the dashboard, tray, and native application lifecycle. One
background utility process hosts the TypeScript review core, Skein's local
runtime, and SQLite persistence. Reviewer adapters invoke separately installed
coding agents.

**The orchestrator doesn't need to be intelligent. The agents it orchestrates do.**

Scheduling, state transitions, retries, and publication decisions use ordinary
application logic. Code reasoning is delegated to the selected agent. The core
will remain independent of Electron so it can later run in a headless host.

## Your account and your data

Selvedge reuses supported authentication in the installed Codex CLI.
Subscription access depends on the provider, account, and supported CLI version;
it is not a promise of unlimited or free reviews. Selvedge will not silently
switch to separately billed API access. This preview uses standard OpenAI routing
with user configuration and extensions disabled; custom providers/model settings
and ambient API-key authentication are unsupported.

Review history and orchestration state stay on your machine. Review context may
be sent to the coding agent's model provider. Local-first does not mean offline
inference. GitHub receives review comments only when you explicitly publish them.

The current review mode inspects bounded source context without running
repository scripts. Selvedge will never automatically merge pull requests or
modify source code. Finding resolution will be conservative: a finding missing
from a later review is not evidence that it was fixed.

## Design documents

- [Architecture](docs/architecture.md): process boundaries, Skein integration,
  reviewer contracts, persistence, recovery, finding history, and security.
- [MVP scope](docs/mvp-scope.md): user journey, included features, defaults,
  exclusions, and release criteria.
- [Implementation plan](docs/implementation-plan.md): phased deliverables,
  dependencies, and acceptance criteria.
- [Next thread workflow](docs/review-threads.md): branch/PR review threads,
  repository instructions, permission boundaries, and human-approved GitHub posting;
  planned rather than shipped.
- [Manual local review](docs/manual-local-review.md): current Codex setup, safety,
  limits, persistence, and verification boundaries.
- [Electron decision](docs/decisions/0001-electron.md): rationale, footprint
  tradeoffs, and consequences.

## Development

Use Node **24.15.0** (`nvm use`) and pnpm **12.18.0**. No global Angular or Nx CLI
is required. If the pinned pnpm is not available, prefix commands with
`npm exec --yes --package=pnpm@12.18.0 -- pnpm`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Installation downloads the pinned Electron binary. Native builds may require the
platform's C++ build tools. pnpm's dependency-script allowlist is explicit in the
workspace configuration. The [SQLite compatibility decision](docs/decisions/0002-sqlite-native-compatibility.md)
records the approved N-API addon override required by Electron 45.

| Command                 | Purpose                                                                 |
| ----------------------- | ----------------------------------------------------------------------- |
| `pnpm dev`              | Build the host/core and launch Electron with the local Rspack renderer  |
| `pnpm build`            | Build the renderer, native Skein graph artifacts, and Electron entries  |
| `pnpm package`          | Create an unsigned host-platform executable bundle under `out/`         |
| `pnpm format`           | Apply ESLint fixes, sort imports/exports, and format authored files     |
| `pnpm format:check`     | Check formatting without modifying files                                |
| `pnpm lint`             | Check source, templates, boundaries, file size, and import/export order |
| `pnpm typecheck`        | Check application, library, tooling, and test types                     |
| `pnpm test`             | Run focused IPC, request-validation, and dashboard-state tests          |
| `pnpm test:integration` | Exercise real Git/SQLite/Skein reviews and cancellation under Electron  |
| `pnpm smoke`            | Package and exercise the complete desktop lifecycle in isolated storage |
| `pnpm verify`           | Run local link checks and the complete configured implementation gate   |

Renderer changes reload during development. Restart `pnpm dev` for changes to the
Electron host or core. Default runtime state lives in Electron's application-data
directory; smoke and integration checks use temporary directories. No database is
stored in the repository or packaged application.

Smoke evidence is written to `.artifacts/desktop.png`, `.artifacts/local-review.png`, and
`.artifacts/measurements.json`. Resource figures are single-sample observations,
not a footprint guarantee. Native rebuilding, development, packaging, and smoke
checks run uncached. No signed installers, publication, or auto-update are configured.

## Contributing

Read [AGENTS.md](AGENTS.md) and the [engineering guidance](docs/engineering/README.md).
The workspace contains the Electron host and Angular renderer under `apps/`, and
an Electron-independent core and browser-safe IPC contracts under `libs/`.

Use feature-owned folders, strict types, small functions, and focused tests. Keep
GitHub, additional reviewers, and publication out until their milestones.
Use Conventional Commits for requested commits.

After cloning, activate check-only Husky hooks with `pnpm hooks:install`.
The hook checks staged formatting and applicable lint, types, and ordinary tests;
it never rewrites or stages files. Run `pnpm verify` before pushing implementation
changes.

## License

Apache-2.0 is proposed to align with Skein-JS. Selvedge's license has not yet been
adopted; a license file and dependency notices are required before an open-source
release. Coding-agent installations remain subject to their own provider terms.
