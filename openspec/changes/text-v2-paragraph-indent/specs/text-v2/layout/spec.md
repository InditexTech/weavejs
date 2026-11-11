## ADDED Requirements

### Requirement: Paragraph indent layout
A plain paragraph (a block without `kind`) with `depth > 0` SHALL be laid out with an indent of `depth * indentStep` (`indentStep` is a multiple of base `fontSize`, the same value used for lists), clamped so at least 4 x base `fontSize` remains for text. All lines of the paragraph, including wrapped lines, SHALL start at that indent, and no marker SHALL be drawn. A plain paragraph with no `depth` SHALL have no indent. Changing a paragraph's `depth` SHALL relayout only that paragraph.

#### Scenario: Indented paragraph
- **WHEN** a plain paragraph has `depth` 2 and `indentStep` 1.5 on base `fontSize` 16
- **THEN** every line of the paragraph starts 48 px from the left edge and no marker is drawn

#### Scenario: Wrapped indented paragraph
- **WHEN** an indented paragraph wraps in a fixed-width box
- **THEN** each wrapped line is wrapped against the width minus the indent and starts at the indent

#### Scenario: Deep indent in a fixed-width box
- **WHEN** depth would leave less than the minimum text width
- **THEN** indent stops growing (0 if the box is smaller than the minimum), and auto-width layouts are not clamped

#### Scenario: Indent with alignment
- **WHEN** an indented paragraph has `align` center or right
- **THEN** the free space is computed after the indent, as for list items

### Requirement: Paragraph indent renders on all clients
Paragraph indent SHALL render whenever a plain block carries `depth > 0`, independent of `richText.enabled`.

#### Scenario: Rich text disabled
- **WHEN** a document with indented plain paragraphs loads with `richText` disabled
- **THEN** the indentation renders identically
