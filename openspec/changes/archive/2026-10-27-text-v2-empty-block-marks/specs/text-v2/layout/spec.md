## ADDED Requirements

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
