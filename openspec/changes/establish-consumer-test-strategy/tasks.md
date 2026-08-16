## 1. Canonical reference-app foundation

- [ ] 1.1 Review the existing WebSocket generator templates and identify the minimal documented Weave configuration, node registration, action/plugin setup, and WebSocket room lifecycle required for a rectangle create, update, delete, remote-render, and reconnect flow.
- [ ] 1.2 Add the non-published `code/apps/reference-frontend` Vite + React application by extracting only that minimal supported browser integration shape from the existing templates.
- [ ] 1.3 Add the non-published `code/apps/reference-backend` Express + WebSocket application using the SDK server entry point and minimal WebSocket store/server lifecycle.
- [ ] 1.4 Implement the initial shared rectangle contract: stable semantic controls or test hooks for creation, attribute update, deletion, rendered-state observation, and current-state reconnection.
- [ ] 1.5 Include standalone-store build/smoke configuration in the frontend reference app while keeping the two-client happy path scoped to WebSockets.
- [ ] 1.6 Keep reference application dependencies and source limited to the supported integration contract; document the boundary that excludes product-specific application behavior.
- [ ] 1.7 Register a second, structurally distinct node type and enable the undo/redo action in the reference frontend as a minimal genericity check for the node-registration and plugin extension points, without expanding into a full node/plugin coverage matrix.

## 2. Package-boundary validation

- [ ] 2.1 Inventory publishable packages, documented browser/server entry points, peer dependencies, and supported standalone/WebSocket configurations to define the validation matrix.
- [ ] 2.2 Add reusable helpers that build selected packages, create `npm pack` tarballs, and install them into cleaned isolated temporary consumer directories without workspace links.
- [ ] 2.3 Configure the reference applications and minimal browser/backend smoke consumers to install packed local artifacts and explicitly import browser entry points and `@inditextech/weave-sdk/server`.
- [ ] 2.4 Add type-check and production-build assertions for the isolated consumers, including failure reporting that identifies the package, entry point, and validation stage.
- [ ] 2.5 Add targeted tests that demonstrate the tarball helper detects omitted published files, invalid exports, declarations, dependency metadata, and browser/server boundary failures.

## 3. WebSocket collaboration integration

- [ ] 3.1 Add Playwright and Chromium test infrastructure with deterministic frontend/backend startup, readiness checks, teardown, and failure diagnostics.
- [ ] 3.2 Implement a two-independent-browser-context scenario that uses the reference-app rectangle controls or test hooks and asserts creation, remote rendering, attribute update, deletion, and convergence through the WebSocket service.
- [ ] 3.3 Extend the rectangle scenario to disconnect and reconnect a client, then assert that it receives and renders current shared state.
- [ ] 3.4 Ensure integration assertions use semantic model and UI state rather than required canvas screenshot pixel comparisons.
- [ ] 3.5 Add a concurrent-edit scenario where both browser clients change the same shared attribute without waiting on each other, asserting both clients converge on the same deterministic state rather than asserting a specific intermediate ordering.

## 4. Generator additions and starter validation

- [ ] 4.1 Add direct frontend and backend generator tests with dependency installation disabled for output trees, renamed dotfiles, manifests, selected transport configuration, and invalid input errors.
- [ ] 4.2 Organize the established reference-app source for generator reuse while keeping test harness code outside generated projects.
- [ ] 4.3 Add the canonical Vite + React frontend option and canonical minimal Express + WebSocket backend option as new generator choices, alongside all existing templates (Next.js + WebSocket, Next.js + Azure Web PubSub, Express + WebSocket, Express + Azure Web PubSub), which remain available and unchanged; ensure generator prompts/CLI flags let a user select unambiguously between an existing template and the new canonical option where names could otherwise collide.
- [ ] 4.4 Add generated-project matrix tests that create every supported standalone/WebSocket starter (existing and new canonical) in a temporary directory, install packed local artifacts, type-check, and production-build it.

## 5. CI and release enforcement

- [ ] 5.1 Add affected lint, type-check, build, and unit-test selection for relevant pull requests.
- [ ] 5.2 Add path-selected, blocking tarball-consumer and Playwright collaboration jobs for changes to publishable packages, package metadata, generators, and reference consumers.
- [ ] 5.3 Cache npm dependencies and reusable build artifacts; report the failed consumer, package, entry point, or transport configuration from distribution jobs.
- [ ] 5.4 Add a nightly matrix for every supported standalone and WebSocket configuration and require the same matrix for release-candidate publication.
- [ ] 5.5 Preserve Azure Web PubSub unit/contract coverage with controlled mocks and verify that normal distribution jobs require neither cloud credentials nor live Azure services.
- [ ] 5.6 Add a Firefox browser-engine lane to the nightly collaboration matrix, keeping the PR-gating collaboration lane on Chromium only.

## 6. Validation and rollout

- [ ] 6.1 Run the full package tarball, reference-consumer, collaboration, generator, and transport matrix locally or in CI to establish a passing baseline.
- [ ] 6.2 Measure and stabilize the new jobs, resolving nondeterministic startup, browser, or temporary-install failures with state-based synchronization and clear diagnostics.
- [ ] 6.3 Enable the new PR gates as release-blocking checks and record the temporary job-disable rollback procedure without removing existing unit and package checks.
