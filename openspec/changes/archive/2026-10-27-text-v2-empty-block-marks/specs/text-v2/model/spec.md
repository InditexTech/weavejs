## ADDED Requirements

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
