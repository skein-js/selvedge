# Tooling and verification

Use Node from `.nvmrc` and the exact pnpm version in `packageManager`. Do not
install global Angular or Nx CLIs. Use one root installation and lockfile.
pnpm 12 stores the hoisted-linker and build-script allowlist in the workspace YAML.
Only explicitly needed dependency build scripts are allowed.

Inspect generator schemas and preview broad generation. Use workspace-local Nx
generators, then adapt their output to the owning standards. Skein's Nx plugin
currently targets Nx 23; this workspace uses explicit Nx targets for Skein's
published artifact builder instead.

ESLint enforces strict typing, platform boundaries, file size, and import/export
sorting through `simple-import-sort`, and rejects duplicate imports from the same
module. Use the sorter's default groups: side-effect imports,
Node built-ins, packages (including workspace libraries), absolute imports, then
relative imports. Side-effect import order is preserved. Prettier owns formatting:
single quotes, width 100, trailing commas, two spaces, UTF-8/LF, and final newlines.
`eslint-config-prettier` disables conflicting lint rules; do not add a second
formatter or import sorter.

The format command applies ESLint fixes (including import sorting), then Prettier
across authored files. Lint and format checks are read-only in CI and Git hooks.
Commands are listed in the root README rather than duplicated here. Formatting,
native rebuilding, development, packaging, and smoke tests are uncached.

The package command creates an unsigned host-platform executable bundle under
`out/`. Forge prunes development dependencies and unpacks native modules from
ASAR. No installer, signing certificate, publisher, or auto-updater is configured.
Renderer source changes reload through Rspack; restart development for host/core
changes. Keep development and production data separate from smoke-test fixtures.

## Git hooks

After cloning the repository and installing dependencies, run `pnpm hooks:install`
to activate the configured Husky hook. The hook
checks staged formatting without rewriting or staging files, then runs applicable
affected lint/type checks and ordinary tests against the working tree. It does
not run expensive packaging checks. Use `pnpm verify` for the full gate.

## CI and evidence

GitHub Actions uses the pinned runtime/package manager and frozen lockfile.
Implementation changes run static checks, ordinary tests, native integration,
production builds, and packaged smoke checks on Linux, macOS, and Windows.
Documentation-only changes run formatting and local-link checks.

Smoke checks use an isolated temporary data directory. Their screenshot and
single-sample startup/memory/bundle measurements are written under `.artifacts/`.
CI explicitly includes that hidden directory when uploading evidence and fails
the upload if no files are present.
Working-set totals can double-count shared pages; these are reproducible baseline
observations, not physical-memory or performance guarantees. The current smoke
journey also records `.artifacts/local-review.png`. Its memory sample is taken
after the fixture reviewer exits, so it does not establish live-review memory.

### Initial macOS ARM64 sample

On 2026-11-13, an unsigned Electron 45.3.1 build with SQLite 13.1.1 measured:

| Measurement                    | Observation |
| ------------------------------ | ----------- |
| Launch to runtime readiness    | 635 ms      |
| Dashboard-open working-set sum | 680 MiB     |
| Tray-only working-set sum      | 525 MiB     |
| Uncompressed executable bundle | 364 MiB     |

These process-tree samples include Playwright's debugging connection and shared
pages. Closing the dashboard removed its renderer. They establish a starting
point for memory work, not a low-footprint claim or an agreed product budget.
Fresh observations are emitted by every successful packaged smoke run.

The [foundation CI gate](https://github.com/skein-js/selvedge/actions/runs/43421481827)
passed the complete verification gate on macOS ARM64, Windows x64, and Linux x64.
Each runner's screenshot and measurements are retained as run artifacts.
This verifies unsigned foundation bundles on those runners; reviewer/provider,
installer, signing, and release checks remain separate gates.

### Manual local-review sample

The macOS ARM64 manual-review preview measured 3,808 ms to readiness, 592 MiB
dashboard-open working-set sum, 439 MiB tray-only sum, and a 367 MiB uncompressed
bundle on 2026-11-13. The fixture reviewer had finished at measurement time. These
are individual observations under debugging, not comparable performance promises
or accepted budgets. Fresh smoke output supersedes these values for a candidate.
The credential-free [manual-review CI checks](https://github.com/skein-js/selvedge/actions/runs/43483405845)
passed on macOS, Windows x64, and Linux x64, including native integration and the
packaged review/cancellation/recovery journey. Screenshots and measurements are
retained as run artifacts. These fixture checks do not establish actual Codex
account/profile compatibility on Windows/Linux; that remains a release gate.

### Upstream peer warnings

The pinned toolchain currently reports optional SSR/WASM peer mismatches and
server-tooling peer ranges for Hono and TypeScript. The application uses client
rendering and native Rspack; it does not run SSR, WASM fallback, or Hono servers.
Skein's graph schema tooling declares TypeScript 5 while the Angular workspace
uses the required TypeScript 6. The actual diagnostic artifact build is verified,
but this is not a compatibility claim for arbitrary future graphs. The local
review artifact also executes in native integration and packaged smoke; schema
analysis can emit upstream TypeScript diagnostic warnings while bundling imports.
Application typechecking remains authoritative and must pass. Recheck these
ranges before adding those capabilities; do not suppress peer warnings globally.
