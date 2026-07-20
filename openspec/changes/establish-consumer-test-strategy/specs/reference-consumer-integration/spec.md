## ADDED Requirements

### Requirement: Minimal reference consumers are established before integration harnesses
The repository SHALL first establish non-published `code/apps/reference-frontend` and `code/apps/reference-backend` applications before adding tarball-consumer or browser collaboration harnesses. The frontend MUST use Vite + React and demonstrate documented node registration, action/plugin setup, state operations, standalone store use, and WebSocket client use. The backend MUST use Express + WebSockets and demonstrate the SDK server entry point and WebSocket server lifecycle.

#### Scenario: Reference consumers establish the initial supported contract
- **WHEN** the reference consumers are introduced
- **THEN** they provide the canonical browser and backend integration shape before package-boundary and browser integration harnesses are implemented

#### Scenario: A product-specific dependency is proposed for a reference app
- **WHEN** a reference consumer is changed to add product UI, a database, authentication, AI, storage, or cloud-specific behavior
- **THEN** the change is rejected because that behavior is outside the supported consumer contract

### Requirement: Reference consumers expose a minimal valid canvas lifecycle
The reference consumers SHALL support a rectangle as the initial shared canvas element. The frontend MUST provide stable semantic controls or test hooks to create, update, and delete that rectangle through supported Weave APIs; the backend MUST host its WebSocket room. The contract MUST include remote rendering and reconnecting to current document state.

#### Scenario: A client creates and updates a rectangle
- **WHEN** a connected client creates a rectangle and changes its supported attributes
- **THEN** the initiating client and a second browser client render the same updated rectangle

#### Scenario: A client deletes a rectangle
- **WHEN** a connected client deletes the shared rectangle
- **THEN** both browser clients converge on a document without that rectangle

#### Scenario: A client reconnects to a rectangle document
- **WHEN** a browser client reconnects after another client has created or updated the shared rectangle
- **THEN** it receives and renders the current rectangle state

### Requirement: WebSocket collaboration converges between browser clients
The integration system SHALL start both reference consumers and use real Chromium in two independent browser contexts to exercise WebSocket collaboration. It MUST assert semantic shared-model and rendered UI state for connection, creation, update, deletion, convergence, and reconnection.

#### Scenario: Two clients synchronize lifecycle changes
- **WHEN** one connected browser client creates shared state, then a client updates and deletes it
- **THEN** the other browser client receives and renders each change and both clients converge on the same state

#### Scenario: A client reconnects after shared state changes
- **WHEN** a browser client disconnects after another client has changed the document and then reconnects
- **THEN** the reconnected client receives and renders the current document state

#### Scenario: Two clients edit the same attribute concurrently
- **WHEN** both browser clients change the same shared attribute without waiting on each other's acknowledgment
- **THEN** both clients converge on the same deterministic state once the CRDT merge settles, without the test asserting a specific intermediate ordering

### Requirement: Reference consumers demonstrate a second node type and a cross-cutting plugin
The reference frontend SHALL register a second, structurally distinct node type beyond the rectangle and enable the undo/redo action, to demonstrate that node registration and plugin extension points generalize beyond a single hardcoded shape. This remains a genericity smoke check and MUST NOT expand into a full node-type or plugin coverage matrix; comprehensive node, action, and plugin coverage stays in package-level unit tests.

#### Scenario: A second node type is registered and rendered
- **WHEN** the reference frontend registers its second node type
- **THEN** a client can create and render an instance of that node type alongside the existing rectangle contract

#### Scenario: Undo/redo reverts and reapplies a shared change
- **WHEN** a client performs a supported change and then triggers undo followed by redo
- **THEN** the shared document reflects the reverted state after undo and the reapplied state after redo

### Requirement: Reference consumers build from packed artifacts
The reference frontend and backend SHALL type-check and complete production builds when installed with locally packed Weave.js artifacts.

#### Scenario: Reference consumers are installed with packed artifacts
- **WHEN** the reference frontend and backend are installed with locally packed Weave.js artifacts
- **THEN** each application type-checks and completes a production build

### Requirement: Browser integration assertions are behavior-based
The collaboration test SHALL use state and UI assertions as its primary correctness signal and MUST NOT require canvas screenshot pixel comparisons to pass.

#### Scenario: Canvas rendering varies without semantic regression
- **WHEN** rendered pixels vary while the expected model and UI state are present in both browser contexts
- **THEN** the collaboration scenario passes without a screenshot comparison
