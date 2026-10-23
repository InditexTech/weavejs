## MODIFIED Requirements

### Requirement: Multi-run capable
The engine SHALL lay out paragraphs with runs of different font, size and family, measuring each run with its own font via a `(font, chunk)` cache, and SHALL size each line by its largest run with mixed baselines aligned.

#### Scenario: Two runs in one paragraph
- **WHEN** a paragraph has runs with different fonts
- **THEN** wrapping accounts for each run's measured width and the line height follows the tallest run

## ADDED Requirements

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
