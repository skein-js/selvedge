# MVP scope

**Status:** Proposed v0.1 scope; Electron is accepted.  
**Design baseline:** 2026-11-13

## Product vision

Selvedge is a personal PR review inbox for developers and maintainers who want
their chosen coding agent to watch selected GitHub repositories. It makes
reviews private by default, preserves their revision history, and tracks
findings conservatively across changes.

The initial product serves one user on one computer. Its value is control over
the reviewer, durable local history, and useful follow-up with little comment
noise. It is advisory; a clean review is not proof of correctness or security.

## Primary journey

The current [manual local-review preview](manual-local-review.md) precedes this
GitHub journey: Codex only, local committed ranges, private saved attempts, and no
cross-commit finding reconciliation. The table below remains the proposed public
MVP rather than a list of already shipped capabilities.

The next [manual thread workflow](review-threads.md) makes each review task a
persistent thread. Users select a repository and branch comparison or PR, run a
private analysis, inspect an issue summary, and approve specific content before
posting to GitHub. Each rerun/new commit adds an immutable attempt to the thread.
Account authorization never replaces per-publication approval. Local branch
reviews work without a GitHub connection; publication requires an explicitly
linked matching PR.

Repository options store a default skill/base branch and project instructions:
stack label (Angular, Next.js, Django, or Other), subdirectory, tool versions,
setup/run/test command text, and environment setup notes without secrets. These
are reference instructions, not permission to execute commands. This manual-first
slice precedes automatic monitoring in the implementation plan.

1. Install Selvedge, provide Git, and choose a supported installed reviewer CLI.
2. Connect one GitHub.com account and select accessible repositories.
3. Confirm the review policy and the provider to which source context is sent.
4. Let Selvedge detect eligible PRs and produce private reviews.
5. Open a notification to see findings, exact revisions, coverage, and history.
6. Inspect whether earlier issues persist, appear fixed, or need verification.
7. Optionally select findings, approve their final preview, and publish a GitHub
   review pinned to the reviewed commit.

On first repository selection, show existing open PRs and let the user choose
which to queue. Enabling monitoring must not unexpectedly spend quota on an
entire backlog.

## Included capabilities

| Area             | MVP behavior                                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Connection       | One GitHub.com account; repository selection; visible connection, permission, and token-expiry errors                                          |
| Discovery        | Detect open PRs, new commits, draft-to-ready changes, retargeting, and base changes affecting the review target; reconcile closure and merging |
| Reviewers        | Interchangeable Codex CLI and Claude Code adapters; one configured reviewer per repository                                                     |
| Results          | Validated severity, explanation, improvement guidance, evidence, and file references where available                                           |
| Revision history | Persist exact head, base, and merge-base SHAs, coverage, policy versions, reviewer identity, and attempts                                      |
| Finding history  | Newly observed, outstanding, needs verification, likely resolved, and user-confirmed resolved; persistent user dismissals with reasons         |
| Dashboard        | Repository and PR lists, review state, finding details, coverage, history, retry/cancel actions, and connection health                         |
| Notifications    | Native notifications for meaningful review outcomes and actionable failures, with persisted deduplication                                      |
| Publication      | Private preview, explicit selection and approval, one GitHub COMMENT review, remote reconciliation after uncertain delivery                    |
| Controls         | Polling interval, concurrency, draft/author/path policies, review limits, pause/resume monitoring, and manual refresh                          |
| Recovery         | Durable queued work, bounded retries, interrupted-attempt accounting, artifact/result recovery, and current-target reconciliation              |

Both named adapters must pass the safety and authentication gates before the
public MVP claims to support them. An earlier developer preview may support
Codex only if that limitation is explicit. An adapter is not complete merely
because its process launches.

## Initial defaults

These are proposed application defaults, not claims about Skein defaults.

| Setting                                                   | Default                                                                                                                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Polling                                                   | Every two minutes per repository; respect longer server-directed intervals and rate-limit backoff                                                                  |
| Push debounce                                             | Thirty seconds after an observed target change                                                                                                                     |
| Reviewer concurrency                                      | One active CLI review globally and one per PR                                                                                                                      |
| Draft PRs                                                 | Skip until ready                                                                                                                                                   |
| Existing PR backlog                                       | User selects what to queue during onboarding                                                                                                                       |
| Publication                                               | Private only until the user approves specific content                                                                                                              |
| Repository scripts and dependency installation            | Disabled                                                                                                                                                           |
| Agent shell tools and automatically discovered extensions | Disabled in the supported automatic-review profile                                                                                                                 |
| Retry budget                                              | At most three total execution attempts per logical review request, including process-loss recovery; authentication/quota blocks pause without repeated agent calls |
| Finding resolution                                        | User confirmation required for the resolved state                                                                                                                  |
| Window close                                              | Destroy the dashboard renderer and continue in the tray                                                                                                            |
| Explicit Quit                                             | Stop monitoring and terminate owned reviewer processes                                                                                                             |

Review size, execution duration, artifact retention, and resource budgets must
receive explicit bounded defaults during the feasibility phase. Oversized work
is deferred or reported partial with exclusions; it is never silently presented
as a complete review. Changing an execution deadline or retry budget requires
an explicit new attempt or user action, not an indefinite retry loop.

## Finding and coverage semantics

Newly observed means first seen by Selvedge; it does not establish that the latest
commit introduced the issue. An earlier finding absent from a later response
remains unresolved until assessed. Incomplete coverage, ambiguous matches, and
unavailable context produce needs verification.

The agent can recommend likely resolved with evidence; the user confirms
resolved. Dismissal records disagreement or accepted risk separately from a fix.
Confirmed findings can reopen when later evidence demonstrates recurrence.

Every review shows its target, completion status, and excluded or deferred files.
A cancelled, failed, stale, or partial review cannot clear prior findings or
display an unqualified clean result.

## Outside the MVP

- Automatic merges, source edits, applying suggestions, or automatic publishing.
- Running tests, builds, package managers, or arbitrary repository commands.
- GitLab, Bitbucket, GitHub Enterprise Server, or multiple GitHub identities.
- Incoming webhooks, a public server, team synchronization, or cloud-hosted work.
- An independently supervised daemon or guaranteed execution while asleep or off.
- Multi-agent consensus, automatic provider fallback, and a separate reasoning
  model for the orchestrator.
- Direct model APIs, OpenAI plan-sharing sign-in, MCP tools, A2A reviewers, or an
  arbitrary plugin marketplace. Existing adapters leave room for these later.
- Semantic indexes, embeddings, a vector database, Redis, or a message broker.
- Code execution in containers or VMs; richer sandboxed review can follow later.

## Release acceptance

The MVP is usable when a fresh supported desktop installation can connect,
monitor a repository, run either advertised reviewer safely, show private
findings, retain their history through a push and restart, and publish approved
content without blind retries or duplicate normal-operation posts.

The [implementation plan](implementation-plan.md) defines phase-specific
acceptance tests. Release blockers include unsafe repository execution,
unverified authentication behavior, false resolution from missing evidence,
stale results displayed as current, and unknown publication outcomes retried
without reconciliation.

Intended platform coverage is macOS ARM64/x64, Windows x64, and Linux x64. Each
advertised platform requires packaged validation. Development on one OS does not
establish support for the others. A narrower preview must state its actual scope.

## Positioning

Automatic reviews, CLI integration, and self-hosting already exist in
[GitHub Copilot](https://docs.github.com/en/copilot/concepts/agent-capabilities/agent-powered-workflows-and-operations/code-review),
[CodeRabbit](https://docs.coderabbit.ai/cli),
[Claude Code Review](https://code.claude.com/docs/en/code-review), and
[PR-Agent](https://github.com/The-PR-Agent/pr-agent).

Selvedge's proposed differentiation is the combination of a private local inbox,
choice of installed reviewer, conservative finding history, and explicit
publication control. It should demonstrate Skein through a useful product rather
than add features solely to exercise every runtime capability.
