# Engineering guidance

Selvedge uses a small TypeScript Nx workspace with pnpm. The desktop and renderer
are two build projects for one shipped product. The core remains usable outside
Electron and shared contracts remain browser safe.

- [Coding and boundaries](coding-standards.md)
- [Tooling and local commands](tooling.md)
- [Testing policy](testing.md)
- [Product architecture](../architecture.md)
- [MVP scope](../mvp-scope.md)

The installed manifest and lockfile record exact versions. Current pins include
Node 24.15.0, pnpm 12.18.0, Nx 24.0.6, Angular 22.2.6, TypeScript 6.0.3,
Electron 45.3.1, and Skein 1.0.0-beta.1. Angular Rspack remains an explicitly
selected experimental build integration; do not silently replace it.

The setup skill's web-service defaults are deliberately adapted: SQLite replaces
PostgreSQL, local IPC replaces HTTP, and the embedded runtime requires no model.
NestJS, Better Auth, TanStack Query, and Vertex AI are not part of this milestone.
