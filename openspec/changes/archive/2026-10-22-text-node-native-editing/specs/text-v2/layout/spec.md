## ADDED Requirements

### Requirement: Shape-based node with facade getters
`WeaveTextNode` SHALL be backed by a `Konva.Shape` subclass exposing Konva.Text-compatible getters (`text`, `fontSize`, `fontFamily`, `width`, `height`, `getTextWidth`, etc.), and SHALL export its instance type publicly.

#### Scenario: Compat getters
- **WHEN** code calls a documented Text-compatible getter on the node
- **THEN** it returns the value Konva.Text would for the same config

### Requirement: Wrap parity
For single-style text, layout SHALL match `Konva.Text` line breaking and size within a defined tolerance on all four layouts: `smart`, `auto-all`, `auto-height`, `fixed`.

#### Scenario: Golden comparison
- **WHEN** golden inputs are laid out with both implementations
- **THEN** line breaks match and sizes differ within tolerance

### Requirement: Lazy cached layout
Layout SHALL be computed lazily and cached; size accessors SHALL force layout; edits SHALL relayout only affected paragraphs.

#### Scenario: Width read before draw
- **WHEN** `width()` or `height()` is read on an unlaid-out node
- **THEN** layout runs and correct size is returned

### Requirement: Multi-run capable
The engine SHALL lay out paragraphs with multiple runs, using a `(font, chunk)` measure cache and `Intl.Segmenter`.

#### Scenario: Two runs in one paragraph
- **WHEN** a paragraph has runs with different fonts
- **THEN** wrapping accounts for each run's measured width

### Requirement: Paint-time culling
Painting SHALL skip lines outside the visible viewport.

#### Scenario: Off-screen lines
- **WHEN** part of a tall node is off-screen
- **THEN** only visible lines are drawn

### Requirement: Server-side rendering
Measurement and rendering SHALL work on node-canvas and skia-canvas backends.

#### Scenario: Server export
- **WHEN** a document is exported server-side
- **THEN** text is rendered

### Requirement: Engine independence
The layout engine SHALL depend on a bounds provider and target, not on `WeaveTextNode`.

#### Scenario: Alternate target
- **WHEN** the engine is used with a non-text-node target
- **THEN** it lays out without importing the text node
