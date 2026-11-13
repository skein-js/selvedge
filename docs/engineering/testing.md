# Testing policy

Every test must earn its cost. Protect distinct behavior, external contracts,
security/data integrity, or a material regression. Extend useful existing
coverage first. No per-file spec requirement, construction tests, blanket
coverage percentage, or incidental markup snapshots.

Before adding or retaining a test, identify the distinct failure it can catch and
check whether existing coverage already catches it. Remove or consolidate checks
that add no protection. Overlap between test layers requires different failure
modes; record that reason in the test inventory. Preserve unique security and
data-integrity coverage when simplifying tests.

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

## Current test inventory

| Check                                                                                                              | Distinct protection                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [IPC sender unit test](../../apps/desktop/src/tests/ipc-security.spec.ts)                                          | Trust only the expected window, top frame, and exact document, including URL suffixes.                                                                                                               |
| [Backend request unit test](../../libs/contracts/src/tests/runtime-contracts.spec.ts)                              | Accept the fixed protocol and reject unknown operations, malformed identities, and injected command/path authority.                                                                                  |
| [Dashboard refresh regression](../../apps/renderer/src/app/features/local-review/tests/local-review-state.spec.ts) | An obsolete in-flight read cannot consume the fresh read needed after a repository mutation.                                                                                                         |
| [Native SQLite integration](../../apps/desktop/src/tests/runtime.integration.spec.ts)                              | Concurrent duplicate admission, exclusive database ownership, and retained state/receipts after close and reopen, using Electron's native ABI.                                                       |
| Manual-review journey in the same integration suite                                                                | Real Git/Skein/SQLite admission, exact SHAs and exclusions, saved results without a second provider call, invalid finding references, and confirmed owned-tree cancellation.                         |
| [Packaged desktop journey](../../tools/smoke.ts)                                                                   | Actual preload/main isolation, a visible saved result, tray/window lifecycle, one crash recovery followed by an error on repeated failure, persistence across process termination, and bounded Quit. |

The sender unit test covers frame/document edge cases; the packaged foreign-window
check verifies the running IPC handler actually enforces authorization. Backend
schema checks protect the utility protocol; the packaged malformed-request check
verifies the exposed preload rejects bad input. These protect separate boundaries.
The native review journey owns result/deduplication semantics. The packaged
journey verifies the real folder-picker/renderer bridge and supervisor cleanup
when the utility is forcibly killed or the application quits; it does not repeat
the native receipt assertions. Both use a fixture CLI rather than a model.
The same native journey verifies imported instruction forwarding and immutable
skill snapshots after reimport. The packaged journey checks native skill picking,
organization grouping, and sorting controls as part of the actual review flow.
Native menu selection is simulated at the platform UI boundary, like the folder
picker; the main/preload/renderer path remains real. The same journey checks that
opening a draft/history does not admit another attempt and that view state is
retained when the renderer is destroyed and reopened.
That journey also selects real fixture branches and switches Electron's theme to
capture the branch form and findings in light/dark modes. The existing native
review journey covers branch discovery (including Unicode names) and exact target
SHAs; no separate component or color-token unit suites are needed.

Keep receipt deduplication in native integration rather than repeating it through
the UI. In the smoke journey, reuse the state returned by readiness waits and use
the rendered result to establish successful window reopening. Do not reassert a
condition already established by its wait. Add coverage only for a distinct risk,
not to meet a test-count or coverage target.

Keep test sources outside production inputs and artifacts. Test target inputs
must include the actual suites so edits invalidate cached results. Missing suite
discovery must fail; do not broadly enable passing with no tests.

Run focused checks during development, then the complete `pnpm verify` gate for
the final candidate. Routine checks never configure or exercise live provider access.
Opt-in account acceptance is separate, explicitly approved, and quota bounded. Local
packaged checks establish the current OS/architecture only; CI configurations do
not establish that remote jobs have passed.
