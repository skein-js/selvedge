# Selvedge contributor and agent guide

Read [engineering guidance](docs/engineering/README.md) before changing code.
The [architecture](docs/architecture.md), [MVP scope](docs/mvp-scope.md), and
[Electron decision](docs/decisions/0001-electron.md) govern product boundaries.

Keep the implementation small: four Nx projects, feature-owned code, pure domain
functions, and explicit effect boundaries. The current milestone is a local
desktop/runtime foundation. Do not add GitHub, models, reviewer processes, remote
services, or publication without a feature request.

**Every test must earn its cost.** Add or update tests only for distinct behavior,
contracts, security/data integrity or a material regression. Prefer relevant
existing coverage; do not require a spec per file or blanket coverage quotas. A
change may need no new tests. Preserve valuable coverage and mandatory checks;
follow the [testing policy](docs/engineering/testing.md) for test selection.

Run `pnpm verify` before handoff for implementation changes. Documentation-only
changes need formatting and link checks. Report checks that could not run.
Never treat source builds as proof of native packaging or provider access.

No commits, Git initialization, publishing, paid inference, or external posts are
implied by ordinary implementation work. Use Conventional Commits when a commit
is explicitly requested.
