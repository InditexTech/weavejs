## ADDED Requirements

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
Documents already containing marks SHALL render them read-only and SHALL preserve them across edits.

#### Scenario: Edit marked text
- **WHEN** a user edits text in a node with marks
- **THEN** marks on untouched text are retained in the committed `blocks`

### Requirement: Drop-in replacement
`WeaveTextV2Node` SHALL use `nodeType` `'text'` so existing documents load and render unchanged, and SHALL NOT modify the existing `WeaveTextNode` class, which keeps working when registered instead.

#### Scenario: Swap registration
- **WHEN** an app registers `WeaveTextV2Node` instead of `WeaveTextNode`
- **THEN** existing `type: 'text'` documents render and edit with the new node
