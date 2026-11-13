# ADR 0002: Use the SQLite N-API addon with Electron 45

**Status:** Accepted  
**Decision date:** 2026-11-13

## Context

The selected Electron 45.3.1 build removes V8 APIs used by better-sqlite3 12.x.
Rebuilding 12.10.0 failed with missing `GetPrototypeV2`, `HolderV2`, and tagged
external-pointer APIs. The latest published 12.x macros retain those assumptions.

Skein 1.0.0-beta.1 and SQLite saver 1.0.4 declare better-sqlite3 ^12.10.0. The
upstream [better-sqlite3 13 release](https://github.com/WiseLibs/better-sqlite3/releases/tag/v13.0.0)
moves the addon to N-API, removing this V8 coupling. Its basic database interface
still needs validation with Skein; an install alone is insufficient evidence.

## Decision

Keep Electron 45.3.1 and pin better-sqlite3 13.1.1. The owner explicitly approved
two narrowly scoped pnpm overrides: the dependency edges from
`@skein-js/storage-sqlite` and `@langchain/langgraph-checkpoint-sqlite`.
Do not override unrelated dependencies or patch vendor source.

## Validation and consequences

Native integration must verify exclusive database ownership, actual run admission,
duplicate receipt reuse, checkpoint persistence, close/reopen, and retained results.
The packaged smoke journey must verify native loading and restart behavior.
Both checks remain mandatory in CI on every advertised platform.

This is an application compatibility override outside the dependencies' declared
range, not an upstream Skein support claim. Revisit it when Skein and the saver
declare N-API addon support. Keep the explicit rebuild and unpacking workflow so
native assets remain validated and correctly packaged.
