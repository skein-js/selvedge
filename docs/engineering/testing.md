# Testing policy

Every test must earn its cost. Protect distinct behavior, external contracts,
security/data integrity, or a material regression. Extend useful existing
coverage first. No per-file spec requirement, construction tests, blanket
coverage percentage, or incidental markup snapshots.

Use Vitest for focused behavioral checks. Put tests, fixtures, and mocks in the
nearest owning `tests/` directory. Ordinary tests are credential-free and need no
native database, Docker, or paid provider. Native persistence tests are separate
`*.integration.spec.ts` suites executed with Electron's Node runtime so the SQLite
ABI matches the application. Playwright exercises the packaged desktop journey.

The current protection boundaries are IPC authorization and input validation,
real SQLite ownership/deduplication/reopening, and packaged lifecycle/recovery.
Avoid duplicating those scenarios across unnecessary test tiers. Use compiler,
lint, formatter, link, and rendered checks for generated wiring or visual-only
changes. Never add permanent tests that merely search configuration text.

Keep the ordinary suite to the two distinct IPC contracts (sender authorization
and request authority). One native integration journey owns duplicate admission,
exclusive database ownership, and retained receipts. One packaged smoke journey
owns the user action, actual preload/main isolation, tray/window lifecycle,
bounded shutdown, and utility-process recovery. Do not repeat receipt deduplication
in the smoke journey or reassert a condition already established by its wait.

Keep test sources outside production inputs and artifacts. Test target inputs
must include the actual suites so edits invalidate cached results. Missing suite
discovery must fail; do not broadly enable passing with no tests.

Run focused checks during development, then the complete `pnpm verify` gate for
the final candidate. No live provider access is configured or exercised. Local
packaged checks establish the current OS/architecture only; CI configurations do
not establish that remote jobs have passed.
