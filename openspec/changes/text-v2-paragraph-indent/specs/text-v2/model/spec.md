## ADDED Requirements

### Requirement: Paragraph depth
Plain blocks (no `kind`) SHALL support the optional `depth` (non-negative integer, unbounded) as paragraph indent; absence means 0. The model SHALL preserve `depth` of plain blocks across edits, block splits, serialization and clipboard copy/paste between nodes, regardless of `richText.enabled`. Pasted `depth` values that are not positive integers SHALL be ignored.

#### Scenario: Copy and paste
- **WHEN** an indented paragraph is copied and pasted into another text node
- **THEN** the pasted paragraph has the same depth

#### Scenario: Merge
- **WHEN** an indented paragraph is joined to the previous block by deleting the line break
- **THEN** the previous block keeps its own depth

### Requirement: Indent and outdent operations
The model SHALL provide pure operations over a range: indent raises `depth` by one for every block in the range, plain or list; outdent lowers `depth` by one for plain blocks (removing the property when it reaches 0, no effect at 0) and keeps the existing list behavior (a list item at depth 0 loses its marker). Toggling a list off SHALL keep its existing behavior and drop `depth`.

#### Scenario: Indent plain range
- **WHEN** indent is applied over two plain paragraphs
- **THEN** both have depth 1 and other blocks are untouched

#### Scenario: Outdent to zero
- **WHEN** a plain paragraph with depth 1 is outdented
- **THEN** it has no `depth` and serializes as before the change

#### Scenario: List toggled off
- **WHEN** a list item with depth 2 is toggled off
- **THEN** the paragraph is plain with no `depth`
