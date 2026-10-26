## Purpose

Defines how rectangle, ellipse and polygon shape labels are rendered and edited: a selectable label engine (`legacy` default, `native` opt-in on the on-canvas text engine), the shared edit lifecycle, native rich text with additive persistence, growth of the shape while typing, and server-side export.

## Requirements

### Requirement: Selectable label engine
Rectangle, ellipse and polygon nodes SHALL accept an optional config selecting the label engine, `legacy` or `native`. When unset, the engine SHALL be `legacy`.

#### Scenario: Default is legacy
- **WHEN** a shape node is created without a label engine config
- **THEN** its label renders as `Konva.Text` and edits through the DOM textarea overlay exactly as before

#### Scenario: Opt in to native
- **WHEN** the node config sets the engine to `native`
- **THEN** its label renders with `WeaveTextV2Shape` and edits through `TextEditSession`

### Requirement: Additive contract
Both engines SHALL read and write the same `labelText` and `label*` props, keep the label child id `labelId(id)`, the `'label-edit'` mutex operation and `WEAVE_STAGE_SHAPE_LABEL_EDITION_MODE`. The only new persisted field SHALL be the optional `labelBlocks`, ignored by the legacy engine.

#### Scenario: Mixed engines
- **WHEN** one client uses `legacy` and another `native` on the same document
- **THEN** both display and edit the same `labelText`

### Requirement: Shared edit lifecycle
Both engines SHALL acquire the mutex, set the label edition stage mode, disable the nodes selection plugin while editing, and on exit release the lock, restore the default mode and re-select the shape.

#### Scenario: Exit re-selects
- **WHEN** the user commits via Escape or outside click
- **THEN** the lock is released, `labelText` is updated through `updateNode`, and the shape is selected

### Requirement: Native engine has no DOM overlay
In `native`, the editor SHALL NOT create a DOM element mimicking the label text; caret and selection SHALL be drawn on the utility layer and the proxy input SHALL be the only DOM element.

#### Scenario: Rotated shape
- **WHEN** a rotated shape is edited
- **THEN** caret, selection and text align with the rendered label with no CSS transform

### Requirement: Native label bounds and growth
In `native`, the label SHALL stay inside the shape's text bounds with `labelPadding*` and `labelVerticalAlign` applied. While typing, the shape SHALL grow via the existing growth callback and SHALL NOT shrink below its original size; growth SHALL converge in a bounded number of passes.

#### Scenario: Typing overflows
- **WHEN** typed text needs more height than the text bounds
- **THEN** the shape grows to fit and shrinks back, down to its original height, when text is removed

### Requirement: Native labels support rich text
In `native`, the edit session SHALL run with rich text enabled (marks, shortcuts, lists, alignment). On commit `labelText` SHALL be the plain mirror of the content, and `labelBlocks` SHALL be persisted only when the content has marks, lists or alignment; otherwise it SHALL be cleared. A stored `labelBlocks` SHALL be rendered only while its plain text equals `labelText`.

#### Scenario: Commit rich content
- **WHEN** the user bolds a word and commits
- **THEN** `labelText` is the plain text and `labelBlocks` holds the bold run

#### Scenario: Commit plain content
- **WHEN** the user commits content with no formatting
- **THEN** `labelText` is set and `labelBlocks` is cleared

#### Scenario: Stale blocks
- **WHEN** a client edits `labelText` without updating `labelBlocks`
- **THEN** the label renders the plain `labelText`

### Requirement: Label min-size helpers are engine-agnostic
The min-size helpers SHALL work with labels from either engine.

#### Scenario: Native label min size
- **WHEN** the min size is computed for a shape with a native label
- **THEN** the result matches the legacy result for the same plain text and typography

### Requirement: Server-side export renders labels
Export SHALL render labels in both engines.

#### Scenario: Export with native label
- **WHEN** a shape with a native label is exported server-side
- **THEN** the label text appears in the output

### Requirement: Native label edit events
The native engine SHALL emit `onEnterShapeLabelEditMode` (with the shape node and the live edit session) when a session starts, `onShapeLabelFormatChange` (node and selection format) while the selection format changes, and `onExitShapeLabelEditMode` (node) when it ends. The legacy engine SHALL NOT emit them.

#### Scenario: Toolbar hook
- **WHEN** a native label edit starts and the user selects bold text
- **THEN** enter fires with the session, and format change fires with the bold format
