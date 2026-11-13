# ADR 0001: Use Electron for the desktop application

**Status:** Accepted  
**Decision date:** 2026-11-13

## Context

Selvedge needs a cross-platform desktop dashboard and a reliable background
process for GitHub polling and PR reviews. TypeScript is the application
language, Skein-JS is the orchestration runtime, and a small memory footprint is
an important product goal.

The verified Skein local implementation requires Node and native SQLite
dependencies. Tauri would therefore still need a packaged Node backend alongside
its Rust host and the system WebView. Electron includes Node and Chromium and
supports a Node-enabled utility process.

## Decision

Use Electron for the MVP. Keep Electron-specific code in the desktop host and
keep the review core usable from an ordinary Node process.

- The main process owns windows, tray integration, notifications, credentials
  bridging, and application lifecycle.
- One utility process owns Skein, SQLite, GitHub access, and reviewer processes.
- A sandboxed renderer displays the dashboard through a narrow preload bridge.
- Reviewer CLIs run only while their review attempts are active.

Use local IPC between these processes. The MVP does not need an HTTP listener.

## Rationale

Electron reduces the number of runtimes and packaging paths maintainers must
coordinate. Skein already contains an Electron consumer demonstrating local
SQLite hosting. A consistent browser engine also reduces UI platform variation.

This is a decision for delivery simplicity and maintainability with an explicit
footprint tradeoff. It does not establish that Electron uses less memory than
Tauri. A Tauri host could still be smaller in a measured equivalent workload.

## Consequences

- Electron, Chromium, Node, and native dependencies must receive regular
  security updates.
- Native SQLite assets must be packaged for the selected Electron ABI and each
  supported OS and architecture.
- The dashboard is created on demand and destroyed when closed. Monitoring
  continues while the application remains in the tray.
- Explicit Quit stops monitoring and shuts down review processes. The MVP is not
  an independently installed background service.
- Tray-only, dashboard-open, and active-review memory must be measured across
  the full process tree. Reviewer resource use must also be reported separately.
- No fixed memory or installer-size claim will be published before measurement.

## Alternatives

| Alternative                                    | Benefit                                        | Reason not selected for the MVP                                                     |
| ---------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| Tauri with a Node backend                      | System WebView and potential footprint savings | Adds Rust/Node packaging and platform WebView work while retaining the Node backend |
| Headless application first as the only product | Smallest UI overhead                           | Does not provide the requested private desktop review inbox                         |

Revisit the host choice if measured resource use prevents acceptable background
operation. Keeping the core independent preserves that option without requiring
two desktop hosts now.

## Evidence

- [Electron process model](https://www.electronjs.org/docs/latest/tutorial/process-model)
  documents main, renderer, and utility processes and renderer termination when a
  window is destroyed.
- [Electron performance guidance](https://www.electronjs.org/docs/latest/tutorial/performance)
  calls for profiling the actual application.
- [Tauri process model](https://v2.tauri.app/concept/process-model/) and
  [Node sidecars](https://v2.tauri.app/learn/sidecar-nodejs/) describe the alternative.
- [Skein local deployment](https://github.com/skein-js/skein-js/blob/a241ff0edec2159c49f27c68f975b4a1b2b385f7/docs/local-deployment.md)
  establishes the Node, SQLite, and desktop packaging requirements.
