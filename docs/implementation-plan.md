# Phased implementation plan

**Status:** Foundation and manual Codex local-review preview implemented; cross-platform release gates remain explicit.
**Design baseline:** 2026-11-13

Electron is the accepted host. The [architecture](architecture.md) and
[MVP scope](mvp-scope.md) define the intended behavior; this plan orders the work
and defines evidence required to move forward. Phases are dependency gates, not
calendar estimates. The current milestone implements the manual local-review
slice described below. The wider GitHub MVP remains future work.

The foundation provides the packaged host, tray/window lifecycle, validated IPC,
one embedded Skein/SQLite runtime, and a retained deterministic check. Its local
gate covers IPC boundaries, real native persistence, and packaged restart/failure
recovery. macOS ARM64 is locally verified. The [foundation CI gate](https://github.com/skein-js/selvedge/actions/runs/43421481827)
also passed on macOS ARM64, Windows x64, and Linux x64. That run predates the
reviewer implementation and does not establish its cross-platform support.

## Current increment: Manual local review, Codex first

This deliberately combines the smallest useful part of phases 0, 1, and 4. Keep
four existing Nx projects, the current desktop, the native Skein artifact builder,
and a plain adapter. No connector framework, SDK, daemon, or extra model is needed.
The [manual-review contract](manual-local-review.md) owns actual bounds and controls.

| Step                       | Deliverable                                                                                   | Acceptance                                                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1. Freeze source           | Native repository picker, opaque IDs, base/head refs, trusted Git object extraction           | Exact base/head/merge-base SHAs; bounded before/after text; exclusions visible; no working-tree edits or scripts              |
| 2. Invoke Codex            | Version/feature detection, restricted native CLI profile, supervised JSONL execution          | Supported CLI only; existing login; bounded input/output/time; no extra tools or provider fallback                            |
| 3. Retain outcomes         | First application SQLite migration, deterministic native graph, receipt and result projection | Same request returns original attempt; invalid locations fail; validated output survives reopening; no automatic paid retries |
| 4. Expose private workflow | One form, status/cancel, findings, saved history                                              | Cost/data destination visible before Run; preparing/running/cancelling/partial/error states; close/reopen preserves work      |
| 5. Prove boundaries        | Extend existing native integration and packaged journey                                       | Cancellation, backend death, and Quit stop owned trees; fixture output is private; no test/fixture in production              |

The accepted desktop refinement replaces the initial web-style hero/cards with
a compact toolbar, repository sidebar, and review pane. Organization/owner groups
come from local GitHub origin metadata; name/recent-review sorting and per-repo
history require no GitHub API. Repositories contain review attempts in the sidebar,
with a distinct New review action, repository search, native group/sort menu, and
retained selection/disclosure state. Navigation follows the established
[desktop interaction contract](manual-local-review.md#desktop-navigation).
A native picker imports bounded local SKILL.md
documents. Users customize them externally and explicitly reimport updates.
Each attempt snapshots its chosen skill and hash; no scripts or adjacent resources
are imported and no tool permissions change. Application schema version 2 retains
repositories, attempts, and imported skills. These behaviors extend the existing
integration and packaged journeys instead of adding parallel test suites.

The new-review form now uses base/review branch selectors with read-only local Git
discovery and sensible defaults, while retaining SHA-pinned results. Local and
already-fetched remote branches can be refreshed without checkout or fetch. The
desktop, Aura controls, and native UI follow the system's light/dark appearance.

These steps are implemented in this working milestone. Automated acceptance is
credential-free; account authentication and output quality require a separate
explicitly authorized synthetic review. Keep that evidence separate from fixture
tests. Local packaged validation covers macOS ARM64. The credential-free
[manual-review CI checks](https://github.com/skein-js/selvedge/actions/runs/43483405845)
passed on macOS, Windows x64, and Linux x64. Actual Codex account/profile acceptance
on Windows/Linux remains a separate release gate.
One opt-in synthetic review using the actual installed Codex 0.167.0 and existing
login passed on macOS ARM64, including validated findings and retained results
after relaunch. This is account-specific evidence, not universal provider support.

The preview deliberately supports only Codex CLI 0.167.0 with standard OpenAI
routing, one review at a time, and 50 retained attempts. It does not track finding
identity across attempts. Application history is durable; provider invocations
are not automatically replayed after process loss.

## Next increment: Review threads, repository settings, and approved posting

The [thread and publication design](review-threads.md) records the next product
direction. Its implementation is pending. Repository setup remains instructions
and configuration only, as explicitly confirmed; framework labels never enable
command execution.

Deliver this manual journey before automatic monitoring:

| Order | Deliverable                                                                                                  | Acceptance gate                                                                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | Stable review threads with immutable attempts; branch selection; repository review/setup settings            | Existing results survive migration; reruns append to a thread; later config/skill edits cannot rewrite prior input; setup/run/test instructions are never executed |
| 2     | GitHub read access and explicit PR selection, including fork/base/head identity                              | Branch reviews still work without GitHub; PR runs retain exact SHAs; account/permission failures are actionable; no automatic backlog spend                        |
| 3     | Finding selection, editable publication preview, posting-permission check, and human-approved COMMENT review | Account access alone cannot post; content/account/target changes invalidate approval; uncertain delivery reconciles before any resend                              |

Each PR gets a persistent product thread, with new attempts for new commits or an
explicit rerun. A thread is a local history container; it does not keep a CLI or
Skein invocation alive while awaiting a person. Posting uses a separate durable
publication intent and exact approval. A local branch stays private unless the
user explicitly links a matching existing PR.

Keep repository options small: default skill/base branch, review guidance, stack,
project subdirectory, tool/runtime versions, and textual setup/run/test instructions.
Angular, Next.js, and Django are descriptive choices rather than framework-specific
execution engines. Store environment names/setup notes without secret values.

Extend existing native/packaged journeys for thread history, config snapshots,
and the approval UI. Add focused GitHub boundary coverage only for new permission,
freshness, and uncertain-delivery risks. Routine tests remain credential-free.

This increment brings the initial controlled-publication slice forward from
phase 5. The broader phases below remain release gates; their numbering is not a
requirement to build polling before the manual thread-to-approved-post journey.
The actual provider/platform safety matrix, cleanup/export, and resource budgets
remain release work. Claude follows after independently verifying its safety and
authentication; connectors, Antigravity, and direct APIs remain optional future
work. No actual repository command execution is included.

## Phase 0: Prove packaging, authentication, and safety

**Deliverables**

- A minimal packaged Electron host with a utility process and Skein SQLite
  assembly, after implementation is authorized.
- A compatibility record for actual published Skein/LangGraph/SQLite/Electron
  versions and the tested reviewer CLI versions.
- Verified supported authentication and noninteractive structured output for
  Codex and Claude Code, including subscription-based CLI use where supported.
- A documented automatic-review profile that prevents repository execution and
  untrusted extension discovery while preserving the chosen authentication.
- Baseline measurements and explicit resource, review-size, execution-time, and
  artifact-retention budgets for later phases.
- A GitHub App registration/device-flow plan, credential-store choice, UI
  framework, and packaging-tool decision. Never commit app secrets or tokens.

**Acceptance criteria**

- A packaged application creates, reopens, and migrates local state, and a second
  runtime owner is rejected cleanly. Native SQLite works under Electron's ABI.
- Destroying the dashboard leaves monitoring-capable background processes alive;
  reopening restores the dashboard without spawning a second backend.
- Each supported reviewer produces validated structured output using its own
  supported sign-in. Invalid flags, missing authentication, refusal, missing
  structured output, and quota blocks produce distinct visible outcomes.
- Adversarial fixtures containing repository hooks, agent configuration, MCP
  entries, scripts, symlinks, and prompt injection do not execute repository code,
  edit source, expose GitHub credentials, or enable extra tools.
- Cancellation, timeout, app Quit, and backend crash leave no surviving owned
  review process tree on each initially supported platform. Process identity
  checks cannot terminate an unrelated reused PID.
- Record full-process memory in tray-only, dashboard-open, and one-review states,
  with reviewer usage separately identified, plus startup and installer size.
  Publish the reference environment and set realistic product budgets before
  feature expansion; do not compare empty framework shells as product evidence.

**Gate:** Unsupported safety/authentication combinations remain disabled. Resolve
the gap, narrow a clearly labeled preview, or revise the design before automatic
reviews. Claude's bare mode cannot be assumed to satisfy subscription reuse.

## Phase 1: Complete one private review without desktop dependencies

**Deliverables**

- Electron-free core with application migrations and review/attempt identity.
- Trusted Git object preparation and bounded immutable review bundles.
- A deterministic Skein-hosted review graph and the first Codex adapter.
- Native admission, artifact/result validation, application projection, and a
  small headless verification harness rather than a production daemon.

**Acceptance criteria**

- A selected fixture or accessible PR produces private findings tied to exact
  head, base, and merge-base SHAs and recorded reviewer/policy versions.
- Repeating admission for one attempt returns its original receipt; repeating
  discovery creates no additional logical review request.
- An explicit re-review is distinguishable from a retry and from a new target.
- Schema, file references, diff locations, completion status, and coverage are
  validated. Partial output, empty invalid output, and exit-zero failure envelopes
  cannot appear as a clean complete review.
- No repository scripts, installation steps, source edits, or GitHub publication
  occur. Oversized inputs are visibly deferred or partial with exclusions.
- The core harness exercises the workflow without importing Electron.

## Phase 2: Add monitoring and bounded scheduling

**Deliverables**

- GitHub connection, selected repositories, polling, and initial backlog selection.
- Persisted polling/backoff state, policy evaluation, push debounce, and separate
  reviewer concurrency controls.
- Supersession and cancellation on target changes, PR closure, and merging.
- A Claude Code adapter implementing the same conceptual contract and safety gate.

**Acceptance criteria**

- Paginated repositories and PR lists are handled. Discovery detects PR opening,
  head updates, force-pushes, draft readiness, retargeting, and relevant base
  changes; tracked PRs reconcile when closed or merged.
- Conditional requests, rate-limit headers, network loss, credential revocation,
  and token rotation are handled without tight loops or dropped tracked PRs.
- Enabling a repository does not automatically spend quota on its entire backlog.
- Rapid observed pushes coalesce. Superseded queued requests never start a CLI;
  late output from cancelled work never becomes the current review.
- The configured agent limit is respected while discovery remains responsive.
  Manual refresh shares deduplication and rate-limit controls.
- User cancellation is preserved through subsequent polling. Restart does not
  reset retry budgets, provider pauses, or approved policies.
- Codex and Claude produce equivalent normalized result semantics. No automatic
  fallback changes the selected provider or billing method.

## Phase 3: Make history and restart recovery trustworthy

**Deliverables**

- Logical findings, immutable observations, matching evidence, user decisions,
  and target-specific projections.
- Startup recovery of receipts, retained results, and validated artifacts.
- Failure classification, persisted retry budgets, cleanup, and diagnostics.

**Acceptance criteria**

- Fixtures cover line movement, renames, similar but unrelated bugs, file deletion,
  force-push, incomplete coverage, and a genuine fix. Ambiguity remains needs
  verification. Newly observed is not mislabeled as newly introduced.
- Missing findings, failed reviews, cancellation, and excluded files cannot
  resolve earlier issues. Agent fix assessments remain likely resolved until
  user confirmation; dismissal remains distinct from a fix.
- A newly supported observation can reopen a previously resolved finding without
  losing its history or the original decision.
- Crash injection covers intent-before-admission, admission-before-receipt-save,
  CLI completion-before-projection, and application transaction boundaries.
  Recovery imports valid existing work before spending another review attempt.
- A process-lost attempt is recorded as failed by the runtime; Selvedge retries
  only eligible current work and never assumes automatic SQLite replay.
- Duplicate imports do not duplicate observations. Receipt expiry does not erase
  application-level completed-review deduplication.
- Backend crashes, repeated restarts, sleep/wake, and network reconnection cannot
  create concurrent orphan reviewers or stale current-state projections.

## Phase 4: Deliver the private desktop inbox

**Deliverables**

- Connection and reviewer setup, repository selection, policy settings, and
  visible provider health.
- PR dashboard, finding details, coverage, review history, cancel/retry actions,
  and user resolution/dismissal controls.
- Tray lifecycle, pause/resume monitoring, and native notifications.

**Acceptance criteria**

- A fresh user can connect GitHub, choose a supported installed agent and a
  repository, and obtain a private review without configuring an LLM for Skein.
- Account permission limits, missing Git/CLI prerequisites, expired credentials,
  and provider quota have actionable states. Secrets never reach renderer state
  or diagnostic logs.
- Exact revision and coverage remain visible. Failed or stale results cannot
  look like current complete reviews.
- Closing and reopening the dashboard preserves monitoring and user decisions;
  explicit Quit terminates owned work within the documented deadline.
- Notifications deduplicate meaningful events, open the correct review, and avoid
  uploading PR content or fetching remote media merely to render a finding.
- Keyboard navigation, focus, accessible labels, and empty/error/loading states
  are verified in the packaged UI. Record rendered evidence and any limitations.
- Resource measurements remain within the phase-zero budgets or trigger an
  explicit documented design adjustment before release.

## Phase 5: Add controlled publication and ship the MVP

**Deliverables**

- Finding selection and final publication preview with target and content hash.
- Durable publication outbox, stable remote markers, and reconciliation.
- Signed/notarized artifacts as required by the advertised platforms, release
  validation, installation instructions, license, notices, and security guidance.

**Acceptance criteria**

- Publication requires approval of specific content and target. A changed target
  or edited preview invalidates approval. The API call explicitly pins commit SHA.
- Selected findings produce one COMMENT review; invalid inline locations fall
  back to the approved summary or require a revised preview, never an unapproved
  content change. Source writes and merges remain unavailable.
- Test rapid double-clicks, repeated commands, revoked write permission, and
  process loss both before posting and after remote success but before local
  acknowledgement. Known posts reconcile by remote ID/marker; uncertainty pauses
  instead of blindly retrying. Ordinary retries do not duplicate comments.
- Previously published finding identities suppress accidental repeat publication.
  Deliberate updates receive a new explicit preview and recorded intent.
- The complete install-to-review-to-update-to-publish journey passes in packaged
  builds on every advertised OS/architecture, including native SQLite, credential
  storage, process termination, notifications, and tray behavior.
- License adoption, dependency notices, third-party terms review, retention and
  data-flow documentation, and a vulnerability-reporting route are complete.
  The README describes only shipped behavior and tested support.

## Verification approach

Use focused deterministic fixtures for normalization, target identity, finding
lineage, and state transitions. Use subprocess and fault-injection integration
tests for cancellation, crash boundaries, admission, and external-effect
reconciliation. Use mocked GitHub behavior for repeatable failure tests and a
dedicated test repository for permission and publication smoke checks.

Live agent checks are opt-in, bounded, and run under a maintainer's own supported
account; they consume provider quota. Routine tests must not require credentials
or automatically launch paid reviews. UI evidence and packaged checks complement
core tests; a source-mode launch is insufficient packaging evidence.

## After the MVP

Consider a supervised headless host, webhooks, GitHub Enterprise, MCP/A2A
adapters, and direct provider connections only after the private-review journey
is reliable. Sandboxed test execution needs a separate threat model. Multi-agent
consensus and semantic matching need evidence that their quality benefit warrants
the additional cost and complexity.
