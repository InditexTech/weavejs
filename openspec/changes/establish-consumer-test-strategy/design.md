## Context

Weave.js is an Nx/npm-workspace monorepo whose publishable SDK, React, renderer, store, and generator packages are consumed outside the workspace. Existing package tests exercise package behavior, but workspace resolution does not prove packed artifact contents, `exports`, type declarations, peer dependency metadata, or browser/server boundaries. The repository has package verification workflows but no minimal in-repository consumer applications or end-to-end collaboration contract.

The existing generated WebSocket applications already use the Weave React/SDK and WebSocket-store APIs, but they are showcase-sized Next.js and Express templates with product-facing features, broad node registration, and ancillary dependencies. They are a source for supported integration code, not a stable compatibility gate. The strategy must preserve independent external showcase applications as examples rather than compatibility gates and test WebSocket collaboration without live cloud dependencies; Azure Web PubSub remains covered by controlled unit and contract tests.

## Goals / Non-Goals

**Goals:**

- Validate supported published-package entry points from isolated consumers that install local npm tarballs.
- Establish the small, focused frontend and backend consumers as the first implementation phase and canonical supported integration shape.
- Exercise a supported rectangle lifecycle: create, remote render, update, delete, and reconnect.
- Exercise semantic two-client WebSocket synchronization in a real browser.
- Validate generator output both structurally and as independently built projects.
- Run the right distribution checks on relevant pull requests and a complete configuration matrix on a schedule.
- Prove that node registration and cross-cutting plugin extension points generalize beyond a single node type, and that concurrent conflicting edits converge deterministically.

**Non-Goals:**

- Recreate external showcase products, their UI, databases, authentication, AI, storage, or cloud integrations.
- Make canvas screenshots the primary integration correctness signal.
- Add a live Azure Web PubSub environment or cloud credentials to CI.
- Replace detailed package unit tests with consumer tests.
- Validate package tarballs against a registry publication.
- Measure or gate on performance, load, or many-concurrent-client scalability; this strategy validates correctness of the consumer contract, not performance characteristics.
- Remove, replace, or deprecate any existing generator template or scaffolding option; canonical starters are additive, and every currently supported combination (Next.js + WebSocket, Next.js + Azure Web PubSub, Express + WebSocket, Express + Azure Web PubSub) remains available and unchanged.

## Decisions

### Test packed artifacts in isolated temporary consumers

The test harness will build the selected publishable packages, create tarballs with `npm pack`, and install those tarballs into temporary projects that do not reference the workspace. The consumers will type-check and build explicit browser imports and `@inditextech/weave-sdk/server`.

Tarballs are selected over workspace links because links can resolve source files or hoisted dependencies that would not be present for npm consumers. Registry publication was considered but rejected because it adds release coupling and network variability without increasing coverage of the package manifest and contents.

### Use two small, non-published reference applications

Before any tarball or browser harness is added, `code/apps/reference-frontend` will be created as a Vite + React app and `code/apps/reference-backend` as an Express + WebSocket service. They will extract the smallest usable slice of the current WebSocket generators: documented Weave configuration, the required node registration, action/plugin setup, and the WebSocket store/server lifecycle. The frontend will expose a stable, semantic test surface for creating one rectangle, updating it, and deleting it; the backend will host the corresponding room lifecycle. The contract will also cover remote rendering and reconnecting to current state. Standalone store use remains a build/smoke concern rather than part of the two-client collaboration flow.

One combined application was considered but rejected because failures would conflate browser and server responsibilities. External showcase repositories were considered as consumers but rejected because product-specific integrations make them unstable compatibility gates.

To prove the contract generalizes rather than only exercising one hardcoded shape, the frontend will also register one additional, structurally distinct node type and enable the undo/redo action as a minimal cross-cutting plugin. This stays a genericity smoke check, not a node-type or plugin coverage matrix: a full matrix of node types, actions, and plugins remains the responsibility of package-level unit tests.

### Test collaboration through Playwright semantic assertions

The integration harness will start both reference applications and use real Chromium with two independent browser contexts. It will assert shared model and rendered UI state while clients create, update, delete, reconnect, and converge through the WebSocket service.

This is more representative than mocked transport or one-page tests. Pixel screenshots are optional diagnostics only because rendering differences make them a weak primary signal. The browser lane will test the WebSocket happy path; detailed action/plugin edge cases stay in Vitest unit coverage.

In addition to the sequential happy path, the harness will run one concurrent-edit scenario: both browser clients change the same shared attribute without waiting on each other's acknowledgment, and the test asserts that both clients converge on the same deterministic result once the CRDT merge settles. This is the scenario that actually exercises Yjs's conflict-resolution behavior rather than only sequential turn-taking, and it stays scoped to the existing rectangle contract rather than expanding into a general conflict-matrix.

The PR-gating lane runs against Chromium only, for speed. The nightly matrix additionally runs the same collaboration suite against Firefox to catch browser-engine-specific regressions without slowing the PR feedback loop; WebKit is not added at this time.

### Share canonical starter application source

The reference consumer source established in the first phase will be the canonical starter shape. Generators will add a new Vite + React frontend option and a new minimal Express + WebSocket backend option that share source with the reference consumers, exposed as additional choices alongside every existing template. No existing generator template is replaced or removed: the current Next.js + WebSocket, Next.js + Azure Web PubSub, Express + WebSocket, and Express + Azure Web PubSub combinations all remain available with unchanged behavior; they are simply not covered by the new canonical-source and generated-project validation added in this change. Generators will retain only generation-specific concerns for the new canonical options: project naming, dependency versions, package-manager installation, README generation, and prompts. Test-only harness code stays outside generated output.

### Split PR, nightly, and release validation by risk

Relevant pull requests will run affected lint, type-check, build, and unit work. Changes to publishable packages, package metadata, generators, or reference consumers will additionally run tarball smoke validation and the WebSocket collaboration scenario as blocking gates. A nightly matrix will cover every supported standalone/WebSocket configuration, and release candidates will run that full matrix before publication.

Running the full matrix for every pull request was rejected due to unnecessary latency. Relying on manual release checks was rejected because package-boundary regressions need an earlier, enforceable signal. CI will cache npm dependencies and build artifacts, and path selection will avoid unrelated runs.

## Risks / Trade-offs

- [Temporary consumer setup may be slow or flaky] -> Cache installs and build artifacts, use deterministic local tarball paths, and clean test directories.
- [Browser tests can be timing-sensitive] -> Use readiness checks and state-based Playwright assertions rather than fixed delays.
- [Shared starter source can complicate generator substitutions] -> Isolate substitutions to generator-owned metadata and test generated output trees without installing dependencies.
- [A large nightly configuration matrix increases maintenance] -> Centralize transport/configuration definitions in the test harness and make each configuration independently addressable.
- [Tarball tests can expose peer-dependency duplication] -> Install declared peers deliberately and use the supported local Konva/Yjs paths only where the consumer contract requires them.
- [Concurrent-edit assertions can be timing-sensitive or flaky] -> Assert on converged state after both clients' operations settle rather than on intermediate ordering, and avoid asserting a specific merge winner where the CRDT contract does not guarantee one.
- [Existing Azure Web PubSub generator templates fall outside the standalone/WebSocket validation matrix and are not covered by the new generated-project build validation] -> Accepted for now; they remain available and unchanged, just untested by this change's new checks.

## Migration Plan

1. Extract and build the minimal canonical reference consumers, including the rectangle create, update, delete, remote-render, and reconnect contract, without changing public runtime behavior.
2. Add pack/install helpers and validate the reference consumers against packed artifacts.
3. Add the collaboration checks as path-selected PR gates, initially observing their duration and stability.
4. Add the canonical Vite + React frontend and minimal Express + WebSocket backend as new generator options, then add generated-project validation covering the existing and new supported starters.
5. Add the nightly configuration matrix and make the new gates release-blocking; rollback a failing rollout by disabling the new workflow job while preserving existing unit/package checks.

## Open Questions

None. The implementation will define the exact package and transport configuration matrix from the publishable package manifests and documented generator options.
