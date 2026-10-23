## MODIFIED Requirements

### Requirement: Marks preserved
Documents containing marks or list blocks SHALL render them, and SHALL preserve marks and block `kind`, `depth` and `start` across edits, regardless of `richText.enabled`.

#### Scenario: Edit marked text
- **WHEN** a user edits text in a node with marks
- **THEN** marks on untouched text are retained in the committed `blocks`

#### Scenario: Plain edit on marked text
- **WHEN** a user edits text containing marks with `richText` disabled
- **THEN** untouched runs keep their marks and list blocks keep `kind`, `depth` and `start`

## ADDED Requirements

### Requirement: Typed marks
Runs SHALL support the marks `bold`, `italic`, `underline`, `strike`, `color`, `size` and `family`. `size` SHALL be stored as a positive ratio of the node base `fontSize`, rounded to 4 decimals; a ratio of 1 SHALL be omitted. Invalid ratios SHALL be ignored on read.

#### Scenario: Plain document unchanged
- **WHEN** no mark is applied
- **THEN** serialized `blocks` are identical to those before this change

### Requirement: List blocks
Blocks SHALL support optional `kind` (`ul` | `ol`), `depth` (unbounded) and `start`. A block without `kind` SHALL be a plain paragraph.

#### Scenario: Ordered numbering
- **WHEN** consecutive `ol` items share a depth
- **THEN** numbering is continuous, restarting after a non-list block or a shallower item, and `start` overrides the first number

### Requirement: Range operations
The model SHALL provide pure operations to apply or toggle a mark over a range, query a mark over a range as `all` | `none` | `some`, split a block carrying `kind` and `depth`, and change depth.

#### Scenario: Partial selection
- **WHEN** bold is applied to half a run
- **THEN** the run is split and normalized with adjacent equal runs merged

### Requirement: Stored marks
A collapsed caret SHALL be able to hold stored marks that override inheritance for the next inserted text until the selection moves.

#### Scenario: Typing after toggle
- **WHEN** bold is toggled at a collapsed caret and the user types
- **THEN** the inserted text is bold
