## Why

The current test suite proves package internals but does not prove that the artifacts published to npm install and work for the supported browser and backend consumer contracts. This can allow broken exports, omitted files, peer-dependency issues, starter drift, and basic WebSocket collaboration regressions to reach a release.

## What Changes

- First extract a minimal, canonical Vite + React and Express + WebSocket integration shape from the existing WebSocket starters into non-published reference consumers under `code/apps/`.
- Include supported rectangle create, update, delete, render, and reconnect behavior in that canonical shape as the initial consumer happy-path contract.
- Add npm-tarball package-boundary validation in isolated consumer projects for publishable packages and browser/server entry points.
- Add a Playwright scenario that verifies two browser clients can create, synchronize, update, delete, reconnect, and render shared WebSocket state.
- Extend the reference contract with a second, distinct node type and a minimal cross-cutting plugin (undo/redo) to prove the node-registration and plugin mechanisms generalize beyond a single hardcoded rectangle.
- Add a concurrent-edit scenario in which two clients change the same shared attribute without waiting on each other, asserting deterministic convergence through the CRDT merge.
- Add generator unit coverage and generated-project build validation using packed local Weave.js artifacts.
- Add the canonical Vite + React frontend and minimal Express + WebSocket backend as new, additional generator template options, sharing source with the reference consumers; keep every existing generator template (including both Next.js and both Azure Web PubSub combinations) available and unchanged.
- Add path-selected PR gates and nightly/release matrices for the new distribution and integration validation, including a Firefox browser-engine lane in the nightly matrix alongside the Chromium PR lane.

## Capabilities

### New Capabilities

- `package-tarball-validation`: Validate publishable artifacts as packages installed from npm tarballs, including their declared public entry points.
- `reference-consumer-integration`: Provide minimal browser and backend consumers and verify real two-client WebSocket collaboration.
- `generated-starter-validation`: Verify generator output against packed artifacts and maintain canonical starter source shared with reference consumers.
- `distribution-test-automation`: Select, schedule, cache, and enforce distribution-level validation in CI.

### Modified Capabilities

None.

## Impact

- Affected code: package build and pack targets; `code/apps/`; SDK, React, WebSocket-store, and generator packages; test helpers; and GitHub Actions workflows.
- Affected tooling: npm pack/install, Vitest, Vite, Express, WebSockets, and Playwright/Chromium.
- Affected release process: changes to publishable packages, package metadata, generators, or reference consumers gain blocking tarball-consumer and collaboration gates; no live Azure credentials or cloud services are required.
