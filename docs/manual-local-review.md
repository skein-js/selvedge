# Manual local-review preview

This is the current implemented milestone, ahead of GitHub monitoring. It reviews
one manually chosen committed range using the installed Codex CLI. It has no
GitHub connection, publication, source editing, or automatic paid retries.

## User journey and supported installation

Install Git and **Codex CLI 0.167.0**, sign in with `codex login` outside Selvedge,
then launch Selvedge. Choose a local repository with the native folder picker,
select **Base branch** and **Review branch**, and run a private review. Defaults
use the known default/main branch and the checked-out branch. A detached HEAD needs
an explicit review-branch choice. Empty repositories need a committed branch first.
The comparison is **merge-base(base, head) → head**, matching a branch review.
Uncommitted changes are excluded. Findings show exact revisions, file/side/line
references, explanations, and suggestions. Excluded files make coverage partial.

Choices are bounded to 1,000 local/cached remote branch references. Symbolic remote
aliases are omitted. **Refresh branches** rereads local Git metadata without a
fetch, checkout, script, or coding-agent call. Changing repositories resets branch
selection; saved reviews retain their original names and exact SHAs. The underlying
core still accepts the existing validated commit references for compatibility.

Light and dark appearance follow the system automatically. Semantic application
colors, Aura/Optimus controls, native controls, window background, and menus track
the same system theme without a separate renderer theme store or IPC capability.

## Desktop navigation

The dashboard is a compact desktop workspace with a repository sidebar and a
review pane. Group repositories by organization/owner or show one repository list;
sort by name A–Z, name Z–A, or latest review. Organization labels come only from a
GitHub `origin` URL read locally, not an authenticated GitHub lookup. Repositories
without a recognized origin appear under **Local repositories**. Selecting a
repository shows its saved attempts. No GitHub request or remote fetch is made.

The interaction follows the project/session organization in
[Codex projects](https://learn.chatgpt.com/docs/projects#organize-projects-and-chats)
and the sidebar control in
[Claude Code Desktop](https://code.claude.com/docs/en/desktop#organize-and-find-sessions):

- **New review** opens a draft for the selected repository. Only **Run private
  review** invokes Codex; navigating history never creates an attempt.
- Organizations contain collapsible repository rows; repositories contain saved
  review attempts with status and time. Selecting an attempt opens its result in
  the main pane. The composer and result are separate views.
- **Add repository** uses the native folder picker. **Find repository** filters
  local names/owners. No placeholder navigation or hidden history truncation is added.
- The heading's **Group and sort** control opens a native platform menu. Grouping
  and sorting are separate radio groups; recent activity is the initial sort.
- Selected repository/review, grouping, sorting, and collapsed sections survive
  closing and reopening the dashboard. These are validated renderer preferences;
  authoritative review history stays in SQLite.

Use normal keyboard-focusable buttons and nested lists with disclosure state,
following [WAI disclosure navigation](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/).
Do not label navigation an ARIA tree/menu without implementing that widget's full
keyboard contract. The group/sort popup itself is an Electron native menu.

## Imported review skills

Choose **Import SKILL.md** to select one local file through the native picker.
The folder name becomes its label. The complete UTF-8 document, including any
frontmatter, is retained as review guidance; it is not evaluated as configuration.
Choose one imported skill or the built-in **General review** for each attempt.
Edit the original file in your editor and import it again to update that skill.
There is no automatic directory discovery or file watching.

Only the selected document is imported. Adjacent scripts, references, assets,
commands, tools, and credentials are not loaded. Skills can customize what to
review, but cannot change the CLI safety profile or grant execution permissions.
Their instructions are sent to OpenAI along with the selected committed source.
Import only guidance you want to use and send for that purpose.

A review snapshots its skill text, SHA-256 digest, and identity at admission.
Reimporting the same canonical file updates future attempts while retaining the
earlier review's guidance. Deleting/editing the source file after import does not
change a saved review. Imported copies stay in local application storage.
This is explicit instruction import, not native agent-plugin installation.

## Codex installation

Codex is detected on PATH, `/opt/homebrew/bin`, and `/usr/local/bin`. GUI launches
may have a different PATH from your shell. Set `SELVEDGE_CODEX_PATH` to an absolute
native executable or the installed Codex JavaScript entry when needed, then
restart Selvedge. Windows `.cmd` shell wrappers are not executed; use the native
`codex.exe` or explicit JavaScript entry. Selvedge never installs a reviewer,
copies credentials, starts login, or silently selects another provider.

Only 0.167.0 is enabled. Version and feature probes do not invoke a model. Upgrade
support requires checking actual controls and rerunning acceptance, rather than
assuming flag compatibility. CLI availability does not prove valid authentication
or available quota; a review can still fail at the provider.

Reviews use the CLI's existing native authentication from HOME/CODEX_HOME. Source
context reaches **OpenAI** and consumes that account's applicable quota or billing.
Ambient API keys and unrelated credentials are omitted. Custom provider routing,
user model/config overrides, corporate proxy settings, and arbitrary connectors
are not supported by this preview. No separately billed fallback is introduced.

## Fixed safety profile

The renderer passes opaque repository IDs, validated references, and request UUIDs.
Only main can open the folder picker. Paths, commands, graph IDs, and arbitrary
channels are unavailable through the renderer API. Existing IPC sender, frame,
navigation, sandbox, context-isolation, and CSP restrictions remain enforced.

Core resolves references to immutable Git objects. Trusted Git argument arrays
disable hooks, fsmonitor, external diff, textconv, lazy fetch, prompts, and global
configuration and local replacement objects. Blob reads do not check out files
or invoke attributes/filters.
Symlinks, submodules, binary/non-UTF-8 files, and unsupported paths are excluded.
Repository scripts and dependencies are never run. Renames are represented as
deletion/addition. Unrelated files and working-tree content are not supplied.

The adapter launches Codex outside the repository with explicit `--no-daemon`,
`--ignore-user-config`, `--ignore-rules`, `--strict-config`, `--ephemeral`,
`--skip-git-repo-check`, `--ask-for-approval never`, read-only sandbox, JSONL output,
and a strict output schema. It disables shell/unified execution, code mode, hooks,
apps, plugins/discovery, multi-agent features, browser/image tools, skill discovery
and dependency installation, goals, web search, project instructions, and MCP
configuration. Source is data in the stdin JSON bundle, not trusted instructions.
Read-only access alone is insufficient to prevent command execution.

Imported skill guidance is a separate prompt field; repository source strings
remain untrusted data. No imported document can select graphs, paths, or CLI flags.

The CLI is trusted installed software running with the user's account permissions;
this is not a complete OS sandbox. Managed provider policy can reject the profile.
Unsupported controls fail closed. A CLI upgrade must not silently restore tools.
JSONL operation events are checked defensively; this supplements the disabled-tool
profile and cannot undo an operation if a provider violates it.

## Execution, persistence, and limits

One utility process owns Skein and both SQLite files. `runtime.sqlite` remains
Skein-owned. Application schema version 2 includes repositories, review records,
and imported skills in `application.sqlite`. No ORM or separate service is added. A short admission
request returns immediately; status queries and cancellation are separate.

The fixed native `local-review` graph invokes a small Codex adapter. An ephemeral
Node supervisor owns the Codex process tree and observes IPC disconnection if
the utility dies. Cancellation propagates from Skein to the supervisor. POSIX
termination uses the owned process group; Windows uses the owned process tree.
No persisted PID is used to kill processes after restart.

A request UUID identifies one attempt. Repeating its command returns the stored
review; reusing it for different input is rejected. Immutable input is saved
before native admission, and the same key recovers a lost admission receipt. An
exclusive start marker blocks replay from issuing another model call. Cancelled
queued work is checked again before provider launch. A new button press creates
an explicit new attempt, even for the same revisions.

Only validated terminal JSON with in-bundle file/side/line references can become a
result. Output is retained atomically with a bundle hash and exact target before
projection into the application database. Recovery adopts an existing validated
artifact instead of calling the agent again. Lost execution becomes interrupted;
failure/cancellation never looks like an empty successful review. Cancellation
is shown as pending until termination is confirmed. There is no automatic retry.

| Bound                           | Current preview                                                               |
| ------------------------------- | ----------------------------------------------------------------------------- |
| Concurrency                     | One review globally; one Skein worker; cron disabled                          |
| Git preparation                 | 30 seconds overall, 8 seconds per Git command, 512 KiB command output         |
| Source                          | 20 text files; 32 KiB per before/after version; 128 KiB total source bytes    |
| Exclusions                      | Up to 1,000; displayed paths truncated to 1,000 characters                    |
| Serialized agent input / output | 2 MiB / 1 MiB                                                                 |
| Findings                        | Up to 50, bounded explanation/suggestion text                                 |
| Skills                          | 16 retained skills including the built-in; 16 KiB per imported UTF-8 document |
| Review deadline                 | Five minutes                                                                  |
| Host startup / backend IPC      | Ten seconds; native picker/menu interaction waits for the user                |
| Explicit Quit                   | Five seconds including backend termination                                    |
| Recovery                        | One automatic backend restart per application launch                          |
| History                         | Up to 50 retained attempts; further admission is blocked                      |

The history cap includes failed/cancelled attempts. Automatic pruning, deletion
UI, and export are deferred; use an isolated `SELVEDGE_USER_DATA` directory for trials.
Application files and Git source checkpoints remain in the application-data
directory until removed while Selvedge is stopped. POSIX permissions restrict
the directory to the user; SQLite/source artifacts are not encrypted at rest.
No telemetry, repository modification, or GitHub publication is added.

Closing the dashboard destroys the renderer and leaves an active review running
in the tray. Explicit Quit cancels it. Diagnostics cannot queue behind an active
review. Reopening/relaunching shows saved history; a result describes its recorded
SHAs, not the current working tree. Finding identity across commits is future work.

## Evidence and remaining gates

Credential-free native integration uses real Git, SQLite, Skein artifacts, and a
fixture CLI. It protects admission, exact targets, exclusions, retained results,
invalid line references, and owned-tree cancellation. The packaged journey uses
that fixture to verify the actual folder-picker/UI bridge, rendering, restart,
backend-death cleanup, and bounded Quit. Fixtures are never packaged.

The native installed Codex profile was also inspected with a loopback-only fake
Responses endpoint and an empty temporary HOME/CODEX_HOME. This checks flag parsing
and advertised tools without credentials or external model calls. It does not
prove account authentication, model output quality, or provider policy compliance.
The final profile advertised only `request_user_input`, with no execution,
filesystem, MCP, browser, or image tools.

Local packaged evidence covers macOS ARM64. The credential-free
[manual-review checks](https://github.com/skein-js/selvedge/actions/runs/43483405845)
passed on macOS, Windows x64, and Linux x64, including native persistence,
owned-process cancellation, backend-death recovery, and bounded Quit. These use a
fixture CLI; actual Codex account/profile acceptance on Windows/Linux remains a
separate release gate. Routine `pnpm verify` never requires provider credentials
or consumes model quota.

On 2026-11-13, one explicitly approved synthetic review also passed through the
packaged desktop with the actual installed Codex CLI 0.167.0 and existing login.
It returned one validated finding for a division-by-zero change, disclosed the
excluded binary file, and retained the identical result after relaunch. No extra
live review or automatic retry was made. This establishes that account/profile on
macOS ARM64, not every subscription, organization policy, or future CLI version.
Labelled-input focus and layout bounds were inspected at 640×540 and 125% zoom.
The live call preceded the compact-sidebar and imported-skill extension; those
later changes are verified with credential-free fixtures, without another paid call.
