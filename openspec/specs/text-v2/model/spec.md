## Purpose

Defines the content model of the text node `WeaveTextV2Node`: canonical blocks and runs, a derived plain-text mirror, lazy synthesis from legacy text documents, and preservation of marks, as a drop-in replacement for the existing text node.

## Requirements

### Requirement: Canonical blocks and runs model
The text node SHALL store content as `blocks[]`, each block holding `runs[{t, m}]`, and SHALL keep `text` as a derived mirror of the plain content.

#### Scenario: Edit updates mirror
- **WHEN** content changes through editing or `blocks` update
- **THEN** `text` equals the paragraphs joined by newline

### Requirement: Lazy synthesis from text
When a node has no `blocks`, the system SHALL synthesize them from `text` (one run per paragraph, no marks) without rewriting the document.

#### Scenario: Legacy document loads
- **WHEN** a document with `type: 'text'` and only `text` is loaded
- **THEN** it renders identically and no state update is emitted

### Requirement: Link mapped to mark
An existing whole-text `link` attribute SHALL be treated as a full-range `link` mark.

#### Scenario: Legacy link
- **WHEN** a node has `link` set and no `blocks`
- **THEN** synthesized runs carry a `link` mark over the full range

### Requirement: Marks preserved
Documents containing marks or list blocks SHALL render them, and SHALL preserve marks and block `kind`, `depth` and `start` across edits, regardless of `richText.enabled`.

#### Scenario: Edit marked text
- **WHEN** a user edits text in a node with marks
- **THEN** marks on untouched text are retained in the committed `blocks`

#### Scenario: Plain edit on marked text
- **WHEN** a user edits text containing marks with `richText` disabled
- **THEN** untouched runs keep their marks and list blocks keep `kind`, `depth` and `start`

### Requirement: Drop-in replacement
`WeaveTextV2Node` SHALL use `nodeType` `'text'` so existing documents load and render unchanged, and SHALL NOT modify the existing `WeaveTextNode` class, which keeps working when registered instead.

#### Scenario: Swap registration
- **WHEN** an app registers `WeaveTextV2Node` instead of `WeaveTextNode`
- **THEN** existing `type: 'text'` documents render and edit with the new node

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

### Requirement: Paragraph alignment
Blocks SHALL support an optional `align` (`left` | `center` | `right`). A block without it SHALL use the node `align`. Splitting or editing a block SHALL preserve it.

#### Scenario: Enter keeps alignment
- **WHEN** Enter is pressed in a centered paragraph
- **THEN** the new block is centered

### Requirement: Line height mark
Runs SHALL support a `lineHeight` mark, a positive multiplier of the run font size. Invalid values SHALL be ignored on read and new values clamped to 0.5 to 4.

#### Scenario: Invalid value
- **WHEN** a run carries `lineHeight` 0 or NaN
- **THEN** the node line height is used

### Requirement: Stored marks
A collapsed caret SHALL be able to hold stored marks that override inheritance for the next inserted text until the selection moves.

#### Scenario: Typing after toggle
- **WHEN** bold is toggled at a collapsed caret and the user types
- **THEN** the inserted text is bold

### Requirement: Empty block marks
A block with no runs MAY carry marks in an optional block-level `m`. Splitting a block (Enter) SHALL give the new empty block the marks at the split point, excluding `link`. A block that has text SHALL NOT retain `m`. Marks queried or applied at a caret in an empty block SHALL read and write that `m`.

#### Scenario: Split at end of sized item
- **WHEN** a block whose text has size ratio 2 is split at its end
- **THEN** the new empty block has `m` with size 2 and no `link`

#### Scenario: Link not carried
- **WHEN** a block ending in a linked run is split at its end
- **THEN** the new empty block's `m` has no `link`

#### Scenario: Text typed
- **WHEN** text is inserted into an empty block with `m`
- **THEN** the text takes those marks and the block no longer has `m`

#### Scenario: Set mark on empty block
- **WHEN** a size is set with the caret in an empty block
- **THEN** the block `m` holds that size and `marksAtOffset` returns it

#### Scenario: Remote clients
- **WHEN** blocks with an empty block `m` are persisted and loaded elsewhere
- **THEN** the loaded model has the same `m`
