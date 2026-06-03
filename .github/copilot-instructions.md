<!--
SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)

SPDX-License-Identifier: Apache-2.0
-->

# Copilot Instructions for Weave.js

## Project Overview

Weave.js is a collaborative whiteboard/canvas SDK built on [Konva](https://konvajs.org/) (2D canvas rendering) and [Yjs](https://yjs.dev/) (CRDT-based real-time sync). It is a monorepo managed with [Nx](https://nx.dev/) and npm workspaces. All source code lives under `code/`.

## Build, Test, and Lint Commands

All commands run from the `code/` directory.

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Build a single package
npm run build --workspace=@inditextech/weave-sdk

# Lint all packages
npm run lint

# Lint a single package
npm run lint --workspace=@inditextech/weave-sdk

# Format all packages
npm run format

# Run all tests
npm run test

# Run tests for a single package
npm run test --workspace=@inditextech/weave-sdk

# Run a single test file (from within a package directory)
npx vitest run path/to/file.test.ts

# Type-check the SDK
npm run types:check --workspace=@inditextech/weave-sdk
```

## Repository Structure

```
code/packages/
  sdk/                        # Core SDK (@inditextech/weave-sdk)
  types/                      # Shared TypeScript types (@inditextech/weave-types)
  react/                      # React integration (@inditextech/weave-react)
  renderer-konva-base/        # Base Konva renderer
  renderer-konva-react-reconciler/  # React-reconciler-based Konva renderer
  store-standalone/           # In-memory store (no network)
  store-websockets/           # WebSocket-based collaborative store
  store-azure-web-pubsub/     # Azure Web PubSub collaborative store
  create-backend-app/         # CLI to scaffold a backend test app
  create-frontend-app/        # CLI to scaffold a frontend test app
docs/                         # Fumadocs-based documentation site (MDX)
```

## Architecture

The `Weave` class (in `sdk/src/weave.ts`) is the central orchestrator. It is constructed with a `WeaveConfig` that wires together the four extension points:

| Extension Point | Base Class     | Purpose                                              |
|-----------------|----------------|------------------------------------------------------|
| `WeaveStore`    | Abstract class | Yjs sync transport (WebSocket, Azure WS, standalone) |
| `WeaveRenderer` | Abstract class | Konva rendering engine                               |
| `WeaveNode`     | Abstract class | Canvas shape definition                              |
| `WeaveAction`   | Abstract class | Tool behavior (draw, select, move…)                  |
| `WeavePlugin`   | Abstract class | Cross-cutting features (selection, snapping, grid…)  |

Internally, `Weave` delegates to a set of **Manager** classes (e.g., `WeaveStageManager`, `WeaveStateManager`, `WeavePluginsManager`) which are not meant to be extended or replaced.

### Data Flow

1. A `WeaveStore` holds a `Y.Doc` with two maps: `weave` (node state) and `weaveMetadata`.
2. On every Yjs `afterTransaction`, subsequent state updates are batched via `requestAnimationFrame`.
3. `onStateChange` triggers `Weave.render()`, which calls `WeaveRenderer.render()`.
4. The renderer diffing maps each state element to a registered `WeaveNode` by `nodeType`, calling `onRender()` for creates and `onUpdate()` for updates.

### Custom Node Pattern

Extend `WeaveNode` and implement at minimum:

```ts
export class MyNode extends WeaveNode {
  protected nodeType = 'myNodeType';
  initialize = undefined;

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const group = new Konva.Group({ ...props, name: 'node' });
    // ... add Konva shapes to group
    this.setupDefaultNodeAugmentation(group);
    this.setupDefaultNodeEvents(group);
    return group;
  }

  onUpdate(instance: WeaveElementInstance, nextProps: WeaveElementAttributes): void {
    instance.setAttrs({ ...nextProps });
    // ... update child shapes
  }
}
```

Always call `setupDefaultNodeAugmentation()` and `setupDefaultNodeEvents()` when implementing custom nodes.

### Custom Action Pattern

Extend `WeaveAction` and implement `trigger()`:

```ts
export class MyToolAction extends WeaveAction {
  protected name = 'myTool';
  onPropsChange = undefined;
  onInit = undefined;

  trigger(cancelAction: () => void, params?: unknown): unknown {
    // Set up Konva stage event listeners
  }

  cleanup(): void {
    // Remove event listeners
  }
}
```

### Custom Plugin Pattern

Extend `WeavePlugin` and implement lifecycle hooks:

```ts
export class MyPlugin extends WeavePlugin {
  protected name = 'myPlugin';

  initialize(): void { /* called once at construction */ }
  onInit(): void { /* called when Weave initializes */ }
  onRender(): void { /* called on each render */ }
  enable(): void { this.enabled = true; }
  disable(): void { this.enabled = false; }
}
```

### Custom Store Pattern

Extend `WeaveStore` and implement the abstract methods `connect()`, `disconnect()`, `handleAwarenessChange()`, and `setAwarenessInfo()`. The base class handles all Yjs document management and undo/redo.

## Key Conventions

### SPDX License Headers

Every source file must start with:

```ts
// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0
```

### Path Aliases

Within the `sdk` package, `@/` maps to `./src/`. Use `@inditextech/weave-types` for shared types.

### TypeScript

- Strict mode is enabled. Avoid `any`; if unavoidable, use `// eslint-disable-next-line @typescript-eslint/no-explicit-any`.
- `noUnusedLocals` is enforced.
- Use `import type` for type-only imports (`verbatimModuleSyntax` is on).

### Testing

Tests use [Vitest](https://vitest.dev/). Test files follow the `**/*.test.ts` pattern. Not all packages currently have test suites.

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/). Enforced by commitlint with `@commitlint/config-conventional`.

### Peer Dependencies: Konva & Yjs

Both `konva` and `yjs` are **peer dependencies** pinned to exact versions (`konva@10.0.2`, `yjs@13.6.27`). When linking packages locally, set these env vars to avoid duplicate instances:

```bash
WEAVE_KONVA_PATH=<repo>/code/node_modules/konva
WEAVE_YJS_PATH=<repo>/code/node_modules/yjs
```

### Dual Entry Points (SDK)

The SDK publishes two entry points:
- `.` — browser/client (`dist/sdk.js`)
- `./server` — Node.js server-side (`dist/sdk.node.js`)

Server-side code lives in `src/backend.ts` and `src/index.node.ts`.

### Nx Caching

Run `npm run reset` (which runs `nx reset`) to clear the Nx computation cache if builds behave unexpectedly.
