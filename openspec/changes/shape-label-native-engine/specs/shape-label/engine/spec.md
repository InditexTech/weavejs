## ADDED Requirements

### Requirement: Selectable label engine
Rectangle, ellipse and polygon nodes SHALL accept an optional config selecting the label engine, `legacy` or `native`. When unset, the engine SHALL be `legacy`.

#### Scenario: Default is legacy
- **WHEN** a shape node is created without a label engine config
- **THEN** its label renders as `Konva.Text` and edits through the DOM textarea overlay exactly as before

#### Scenario: Opt in to native
- **WHEN** the node config sets the engine to `native`
- **THEN** its label renders with `WeaveTextV2Shape` and edits through `TextEditSession`

### Requirement: No schema or contract change
Both engines SHALL read and write the same `labelText` and `label*` props, keep the label child id `labelId(id)`, the `'label-edit'` mutex operation and `WEAVE_STAGE_SHAPE_LABEL_EDITION_MODE`. No new persisted field SHALL be added.

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

### Requirement: Native commit flattens to plain text
On commit the native engine SHALL persist the plain-text content as `labelText`.

#### Scenario: Commit
- **WHEN** edit ends with changed content
- **THEN** `labelText` equals the plain text of the edited blocks

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
