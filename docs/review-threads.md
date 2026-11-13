# Review threads and human-approved publication

**Status:** Next-milestone design; not implemented. Repository setup is instructions
and configuration only, as confirmed on 2026-11-13.

The current [manual preview](manual-local-review.md) retains one record per Codex
attempt. This increment turns the product into a repository review workspace:
choose a branch or PR, review it privately, inspect the findings, and explicitly
approve any GitHub publication. Automatic monitoring follows this manual journey.

## Desktop journey

1. Select an organization/owner and repository in the existing sidebar.
2. Choose **New review**, then **Branch** or **Pull request**.
3. For a branch, choose the base and head branches/revisions. For a PR, select an
   accessible open PR or enter its URL/number; show the base repository, source
   repository, branch names, and current head SHA before admission.
4. Confirm the review skill and repository instructions. **Run private review**
   starts one attempt and opens its thread. Source/provider disclosure stays at
   the point of action.
5. Inspect the summary, severity counts, individual issues, locations, suggested
   improvements, and coverage. Partial, failed, interrupted, and outdated outcomes
   remain visible. Counts and status are derived from validated findings without
   another model call.
6. Select findings for publication, edit their proposed comment text, and choose
   **Preview GitHub review**. Findings start unselected; the user chooses what leaves
   the private thread.
7. Inspect the destination, posting account, reviewed commit, summary, and exact
   comments. **Approve and post** authorizes that specific publication.
8. Retain the GitHub review link or an actionable failure/uncertainty state in the
   thread. Rerunning the review appends another attempt without replacing history.

Keep the established project/thread navigation. The sidebar becomes organization
→ repository → review thread. A thread owns its attempt history; the main pane
shows its timeline and the selected attempt's result. Repository settings open
from the repository's options control. No general chat composer is required.

## Thread, attempt, and target identity

| Concept        | Responsibility                                                            |
| -------------- | ------------------------------------------------------------------------- |
| Review thread  | Stable local container for one review task and its history                |
| Target         | A branch comparison or verified GitHub PR identity                        |
| Review attempt | One explicitly admitted agent invocation and its immutable inputs/outcome |
| Publication    | One exact approved outbound payload and its delivery record               |

A PR thread is associated with GitHub host, immutable base-repository ID, and PR
number. New commits append attempts to that thread. A branch thread receives a
local UUID and retains its comparison refs; repeated branch names alone do not
merge unrelated user-created threads. Linking a branch thread to an existing PR
is explicit and validates repository and revision correspondence.

Each attempt retains exact base/head/merge-base SHAs, skill text/hash, repository
settings revision/hash, reviewer identity, and validated findings. A target moving
does not rewrite a previous attempt. Reruns use new attempt IDs; retrying delivery
of the same admission reuses that attempt's key. The preview's no-automatic-paid-
retry policy remains in force for this increment.
Give findings stable attempt-scoped IDs for selection and publication. Cross-commit
finding lineage remains separate work; threads alone do not prove an issue fixed.

Product thread IDs are separate from Skein checkpoint threads. Keep a fresh,
deterministic Skein execution thread/admission identity per attempt. The product
thread groups those attempts in application SQLite; it is not a permanently
running graph or an LLM conversation. Complete the CLI process after analysis.
Persist the waiting-for-approval state locally without holding a worker open.

Migrate each existing review record into its own initial product thread, preserving
its attempt identity, exact result, and history. Map the existing sidebar selection
to its migrated thread. Extend application SQLite for actual thread, settings,
and publication data; retain the four Nx projects.
A timeline can be derived from these records without a generic event-sourcing
framework or conversation database.

## GitHub permission and approval

GitHub sign-in is separate from Codex sign-in. Repository access and publication
are separate product capabilities. Connecting an account never approves posting.
Keep read-only workflows usable when publication permission is unavailable.

The existing [GitHub App direction](architecture.md#github-authentication-and-publication)
remains the baseline. Posting **as the connected user** uses user authorization;
an installation token is a different actor and must not be silently substituted.
Credentials stay behind the host credential boundary, outside renderer state,
repository settings, skills, and agent environments.

The [GitHub review API](https://docs.github.com/en/rest/pulls/reviews#create-a-review-for-a-pull-request)
requires PR write permission for creation and accepts an explicit commit SHA.
GitHub App permissions depend on the app and installation as well as the user;
a local **Enable posting** choice cannot grant missing GitHub permissions.
Explain any required authorization/installation change before requesting it. See
[GitHub's permission model](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app).

Every publication requires a fresh approval bound to the account, repository ID,
PR, attempt, target SHAs, selected finding IDs, exact outbound text, and content
hash. Granting write access or enabling posting for a repository is not blanket
approval for future reviews. Editing the preview, switching accounts/targets,
or observing a changed PR head/base invalidates the approval.

Use a single COMMENT review initially. Start with a summary containing selected
findings and source references; add inline comments only after reliable diff
location mapping. Build the preview from existing validated output and user edits,
without another model call. Do not create pending GitHub reviews while the user is still
editing a private preview: that is already an external write. Do not request
approval/request-changes review states or merge/source-write capabilities here.

Before sending, recheck account identity/permissions, PR state, and target. Always
pin the reviewed commit explicitly. A PR can move between that check and the API
write; commit pinning preserves provenance, not an atomic guarantee of freshness.
If that race occurs, retain and clearly label the posted review's older target.

Persist publication intent before sending and serialize sends for the PR. Double
clicks reuse the same publication ID. Store a stable marker and remote review ID.
If the response is lost, reconcile remote reviews before another send. An unknown
delivery result remains uncertain until resolved; Skein idempotency does not make
the GitHub API exactly once. Follow the existing publication outbox design.

A local branch has no implicit GitHub posting destination. Keep its results
private until the user links an existing matching PR. This increment does not
push branches, open PRs, or post repository-wide issues on the user's behalf.

## Repository instructions and configuration

Add one **Repository settings** section with two small groups:

| Group         | Initial fields                                                                                                                                     |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Review        | Default imported skill, default base branch, review context/instructions                                                                           |
| Project setup | Stack label, project-relative subdirectory, runtime/tool versions, setup/run/test command instructions, environment variable names and setup notes |

Stack labels include Angular, Next.js, Django, Other, and Unspecified. These are
descriptive metadata, not separate runtime adapters. Users provide the actual
commands; do not assume a framework determines a package manager, project path,
or test runner. Support monorepos with a validated repository-relative project
directory. Keep local Git paths behind the existing native picker boundary.
The setup directory describes project context; it does not silently filter the
reviewed files. Any future path exclusions must remain visible in coverage.

For example, a user can describe an Angular app in `apps/web`, a Next.js app at
the repository root, or a Django service in `backend`, together with its required
toolchain and commands. Selvedge stores those instructions as text. It does not
run them, install dependencies, start servers, read environment values, or load
`.env` files. All reviews retain the current execution-disabled CLI profile.
Show a deterministic **Commands not run** indicator; setup instructions and an
agent's prose must not be presented as execution evidence.

Keep skills reusable across repositories; keep setup details repository-specific.
Resolve precedence explicitly: fixed safety constraints, user-approved repository
settings, selected skill guidance, then untrusted source as data. Preview the
effective settings before Run and snapshot them into the attempt. Users can edit
conflicting guidance, and the documented precedence determines which instruction
applies. Do not add semantic conflict detection, automatic blending, or a separate
LLM call to merge or summarize settings.

Store bounded, versioned settings in application SQLite. Initially use application
settings only; no automatic repository configuration import or framework detection
is needed. A settings screen can record expected environment variable names and
setup steps, not secret values. Explain that supplied instructions are included
in provider context. PR content cannot update trusted settings or skills.

Actual command execution would require a separate workspace/confinement design,
permission model, process-tree ownership, and acceptance evidence. It is outside
this increment, including when a stored skill requests it.

## Delivery order and key acceptance

| Slice                     | Deliverable                                                                                                                  | Acceptance evidence                                                                                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Threads and settings   | Domain thread/attempt split, legacy migration, branch picker, repository settings, immutable settings snapshots              | Existing results survive migration; two runs remain in one thread; later settings edits cannot change old inputs/results; browsing starts no agent      |
| 2. Manual PR review       | GitHub connection/read access, explicit PR picker, verified base/head/fork metadata, reuse the private review path           | Local branches still work without GitHub; exact selected target is retained; revoked/read-only access has actionable states; no automatic backlog spend |
| 3. Human-approved posting | Selected findings, editable summary preview, capability check, exact approval, durable publication intent and reconciliation | No write before approval; changed text/account/target invalidates approval; repeated clicks or lost acknowledgements do not blindly duplicate posts     |

Extend the native integration journey for thread migration and immutable settings.
Use one focused GitHub boundary suite for read/permission/approval/delivery risks
that existing local tests cannot exercise. Extend the packaged journey for thread
selection, repository settings, and preview/cancel/approve wiring. Do not repeat
the same deduplication assertions in every layer or add per-component specs.

Routine tests use fixtures and never post to GitHub or call a live model. A live
publication smoke needs a dedicated test PR and separate explicit authorization
for the exact content/destination. Finish this manual thread-to-approved-post
journey before adding polling, automatic rereviews, or more reviewer providers.
