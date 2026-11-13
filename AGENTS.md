# Selvedge contributor and agent guide

Read [engineering guidance](docs/engineering/README.md) before changing code.
The [architecture](docs/architecture.md), [MVP scope](docs/mvp-scope.md), and
[Electron decision](docs/decisions/0001-electron.md) govern product boundaries.

Keep the implementation small: four Nx projects, feature-owned code, pure domain
functions, and explicit effect boundaries. The current milestone is a local
desktop/runtime foundation. Do not add GitHub, models, reviewer processes, remote
services, or publication without a feature request.

**Keep only useful, nonduplicated tests.** Each test must protect a distinct
behavior, contract, security/data integrity risk, or material regression. Before
adding a test, identify what existing coverage misses. Remove or consolidate
redundant scenarios, assertions, and polling in the touched area; overlap between
test layers must catch different failures. A change may need no new tests.
Preserve valuable coverage and mandatory checks, without per-file specs or
coverage quotas. Follow the [testing policy](docs/engineering/testing.md).

Run `pnpm verify` before handoff for implementation changes. Documentation-only
changes need formatting and link checks. Report checks that could not run.
Never treat source builds as proof of native packaging or provider access.

No commits, Git initialization, publishing, paid inference, or external posts are
implied by ordinary implementation work. Use Conventional Commits when a commit
is explicitly requested.
