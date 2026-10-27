## Purpose

Defines text layout and rendering for `WeaveTextV2Node`: a Shape-based node with Konva.Text-compatible getters, wrapping parity with Konva.Text across the four layouts, lazy cached layout, culling, and browser and server rendering.

## Requirements

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
The engine SHALL lay out paragraphs with runs of different font, size and family, measuring each run with its own font via a `(font, chunk)` cache, and SHALL size each line by its largest run with mixed baselines aligned.

#### Scenario: Two runs in one paragraph
- **WHEN** a paragraph has runs with different fonts
- **THEN** wrapping accounts for each run's measured width and the line height follows the tallest run

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

### Requirement: Mark painting
The painter SHALL group fragments by font and paint per-run color, underline and strikethrough.

#### Scenario: Mixed styles
- **WHEN** a line has bold, colored and underlined runs
- **THEN** each fragment is drawn with its own font, color and decoration

### Requirement: List layout
List blocks SHALL be laid out with an indent of `depth * indentStep` (`indentStep` is a multiple of base `fontSize`) clamped so at least 4 x base `fontSize` remains for text, and a marker in the gutter cycling by depth (disc/circle/square; 1./a./i.). Markers SHALL NOT be part of `text` or offsets, and numbering SHALL NOT invalidate other paragraphs' cached layouts.

#### Scenario: Deep nesting in a fixed-width box
- **WHEN** depth would leave less than the minimum text width
- **THEN** indent stops growing (0 if the box is smaller than the minimum), marker style keeps cycling, and auto-width layouts are not clamped

#### Scenario: Typing in an item
- **WHEN** text in one list item changes
- **THEN** only that paragraph is relaid out

### Requirement: Paragraph alignment layout
Each line SHALL be aligned by its paragraph `align`, falling back to the node `align`; the indent of list items SHALL stay on the left. Changing `align` SHALL NOT relay out wrapping.

#### Scenario: Mixed alignment
- **WHEN** two paragraphs have different `align`
- **THEN** their lines are positioned accordingly and cached paragraph layouts are reused

### Requirement: Per-run line height
A line's height SHALL be the maximum over its runs of `(run.lineHeight ?? node lineHeight) * run font size`, with one shared baseline. Culling and the fixed-height cut-off SHALL use real line heights. Vertical alignment SHALL remain a node-wide setting based on the total content height.

#### Scenario: Mixed line heights on one line
- **WHEN** a line contains runs with line heights 1.0 and 1.5
- **THEN** the line box uses the larger resulting height

#### Scenario: Lower value on part of a line
- **WHEN** a smaller line height is set on a run sharing a line with a taller run
- **THEN** the line height does not shrink

### Requirement: Link runs
Runs with a safe `link` mark SHALL render with the link colour and an underline, and the hovered link run SHALL use the hover colour; the legacy node-level `link` SHALL take precedence when set. Links SHALL render regardless of `richText.enabled`.

#### Scenario: Hover
- **WHEN** the pointer is over a link run
- **THEN** only that run uses the hover colour and the cursor is a pointer

#### Scenario: Unsafe URL
- **WHEN** a run carries a non-http(s) `link`
- **THEN** it renders as plain text and cannot be opened

### Requirement: Lists render on all clients
List markers and indent SHALL render whenever blocks carry `kind`, independent of `richText.enabled`.

#### Scenario: Flag off
- **WHEN** a document with list blocks loads with `richText` disabled
- **THEN** markers and indentation render identically

### Requirement: Export parity
Image export, including server-side, SHALL render rich runs and lists; per-run font families SHALL be available to the server measurer.

#### Scenario: Export
- **WHEN** a rich node is exported
- **THEN** the image shows the formatting

### Requirement: Empty block marks layout
For a block with no runs, layout SHALL use the block `m` for empty-line height and baseline (size, line height, family) and for the list marker font, size and color. Changing `m` SHALL invalidate the cached layout of that block.

#### Scenario: Marker size
- **WHEN** an empty list item has `m` size 2
- **THEN** its marker renders at twice the base size

#### Scenario: Empty line height
- **WHEN** an empty block has `m` size 2
- **THEN** the line height and baseline match a size 2 line, so typing causes no jump

#### Scenario: No marks
- **WHEN** an empty block has no `m`
- **THEN** layout uses the base style as before
