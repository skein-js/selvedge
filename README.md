# Selvedge

_Catch the loose ends before they unravel._

Selvedge is a planned open-source, local-first pull request watcher powered by
[Skein-JS](https://skein.js.org/). It will monitor selected GitHub repositories,
delegate reviews to your chosen coding agent, and keep findings connected to the
exact commits they describe.

Reviews arrive in a private desktop inbox. Inspect findings, follow them across
updates, and choose what to publish to GitHub.

## Project status

**Desktop foundation.** The repository now contains an Electron/Angular workspace,
secure IPC, and a deterministic Skein/SQLite local check. PR monitoring and coding
agent integration are still planned. There is no end-user release or installer.

The foundation uses no account, credentials, or model calls. Its check records a
completion timestamp, deduplicates repeated request IDs, and retains its result
across application restarts. Closing the dashboard leaves the application in the
tray; Quit stops the local runtime.

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

Selvedge will reuse supported authentication in the installed reviewer CLI.
Subscription access depends on the provider, account, and supported CLI version;
it is not a promise of unlimited or free reviews. Selvedge will not silently
switch to separately billed API access.

Review history and orchestration state stay on your machine. Review context may
be sent to the coding agent's model provider. Local-first does not mean offline
inference. GitHub receives review comments only when you explicitly publish them.

The default review mode will inspect bounded source context without running
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
| `pnpm build`            | Build the renderer, native Skein graph artifact, and Electron entries   |
| `pnpm package`          | Create an unsigned host-platform executable bundle under `out/`         |
| `pnpm format:check`     | Check formatting without modifying files                                |
| `pnpm lint`             | Check source, Angular templates, platform boundaries, and file size     |
| `pnpm typecheck`        | Check application, library, tooling, and test types                     |
| `pnpm test`             | Run focused IPC security and request-validation tests                   |
| `pnpm test:integration` | Exercise real SQLite persistence using Electron's Node runtime          |
| `pnpm smoke`            | Package and exercise the complete desktop lifecycle in isolated storage |
| `pnpm verify`           | Run local link checks and the complete configured implementation gate   |

Renderer changes reload during development. Restart `pnpm dev` for changes to the
Electron host or core. Default runtime state lives in Electron's application-data
directory; smoke and integration checks use temporary directories. No database is
stored in the repository or packaged application.

Smoke evidence is written to `.artifacts/desktop.png` and
`.artifacts/measurements.json`. Resource figures are single-sample observations,
not a footprint guarantee. Native rebuilding, development, packaging, and smoke
checks run uncached. No signed installers, publication, or auto-update are configured.

## Contributing

Read [AGENTS.md](AGENTS.md) and the [engineering guidance](docs/engineering/README.md).
The workspace contains the Electron host and Angular renderer under `apps/`, and
an Electron-independent core and browser-safe IPC contracts under `libs/`.

Use feature-owned folders, strict types, small functions, and focused tests. Keep
GitHub, reviewers, and publication out of the foundation until their milestones.
Use Conventional Commits for requested commits.

After cloning, activate check-only Husky hooks with `pnpm hooks:install`.
The hook checks staged formatting and applicable lint, types, and ordinary tests;
it never rewrites or stages files. Run `pnpm verify` before pushing implementation
changes.

## License

Apache-2.0 is proposed to align with Skein-JS. Selvedge's license has not yet been
adopted; a license file and dependency notices are required before an open-source
release. Coding-agent installations remain subject to their own provider terms.
