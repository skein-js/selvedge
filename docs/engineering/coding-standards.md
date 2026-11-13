# Coding standards and boundaries

## TypeScript and organization

Use strict TypeScript with `noUncheckedIndexedAccess`, precise unions, and Zod
validation at independent trust boundaries. Treat untrusted data as `unknown`.
Avoid `any`, unchecked casts, and non-null assertions. Isolate unavoidable dynamic
module checks at the loading boundary and explain their assumptions.

Keep authored TypeScript, including tests and tooling, under 300 nonblank,
noncomment lines. Split by responsibility rather than compressing code or
disabling the rule. Prefer small functions, readonly inputs, named exports,
kebab-case filenames, shallow nesting, and explicit dependencies. Use thin
classes for actual stateful resources and Angular lifecycle/DI.

Keep feature code with its owner. Create no generic service/repository framework,
global utilities dumping ground, unused feature folders, or shared UI wrappers.
Extract shared behavior only for an actual reuse or platform boundary.

Use the shared ESLint/Prettier configuration for imports and formatting. Keep
cleanup focused on removing actual duplication or complexity; preserve validation
at independent trust boundaries and avoid speculative abstractions.

## Project ownership

| Project   | Ownership                                                              | Allowed library platforms |
| --------- | ---------------------------------------------------------------------- | ------------------------- |
| desktop   | Electron main, preload, utility entry, lifecycle, and packaging        | node, shared              |
| renderer  | Angular presentation and browser-safe IPC consumption                  | web, shared               |
| core      | Embedded Skein runtime and review-domain logic; no Electron imports    | node, shared              |
| contracts | Zod wire schemas and inferred types; no Node or framework dependencies | shared                    |

Applications never import other applications. Libraries never import application
source. Use the generated library entry points. Nx platform tags and ESLint
import restrictions enforce the browser/native boundary.

## Angular

Use standalone, zoneless, OnPush components with inline templates/styles. Signals
own local state and `computed` owns derivation. Effects are for unavoidable
external synchronization with cleanup. Do not create a second cache for future
API-backed state. Signal Forms and TanStack Query are added only when actual
forms or API behavior need them.

Use Optimus primitives, Aura semantic tokens, Tailwind, and native semantics.
Keep keyboard access, focus visibility, labels, disabled/loading/error states,
and small-window behavior usable. Inspect the rendered product for UI changes;
compilation does not establish usability. Avoid fake data and inactive controls.
Prefer a classic desktop workspace: compact toolbars, a sortable repository
sidebar, and a focused review pane. Avoid marketing heroes and oversized web-page
cards in the application. Reuse the global native control styles and Optimus buttons.
Follow the [desktop navigation contract](../manual-local-review.md#desktop-navigation):
repositories contain review attempts, view controls use the native menu, and
navigation never starts a review. Preserve view state when recreating the window.
Support system light/dark appearance through shared semantic colors and Aura's
system theme. Keep native window backgrounds and controls aligned; avoid per-component
hardcoded palettes or a second theme state store.

## Runtime and security

Keep decisions pure and effects at explicit boundaries. Validate IPC in preload,
main, and utility processes; validate the originating document and top frame.
Expose specific capabilities, never raw Electron, arbitrary channels, filesystem
paths, shell commands, graph selection, or credentials.

Keep Node integration off and context isolation and renderer sandboxing on.
Maintain CSP and navigation restrictions. A utility process isolates failures;
it is not a security sandbox for untrusted repository execution.

One process owns the runtime database. Keep state outside build output, dispose
workers before storage, and preserve idempotency keys across delivery retries.
Use Skein's native graph artifact build; do not substitute the renderer bundler.
Do not install a provider, broker, database abstraction, or remote service without
a concrete product requirement. Ordinary verification needs no credentials or
live model calls. Manual reviews use the installed CLI's authentication; live
acceptance checks require explicit account-quota approval.
