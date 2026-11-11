## ADDED Requirements

### Requirement: Paragraph indent commands
`indent` and `outdent` SHALL apply to plain paragraphs as described for editing, in an active session and on a selected non-editing node (whole text or a given range). Outside a session each call SHALL be one `updateNode`. The step SHALL be the existing `config.richText.indentStep`. When rich text is disabled for the node they SHALL be no-ops.

#### Scenario: Modal indent
- **WHEN** `indent(node, range)` targets a non-editing node with plain paragraphs
- **THEN** the paragraphs in range are indented with one undo step

#### Scenario: Whole node
- **WHEN** `indent(node)` is called without a range
- **THEN** every paragraph of the node is indented

#### Scenario: Disabled
- **WHEN** `indent` is called on a node with rich text disabled
- **THEN** nothing changes

## MODIFIED Requirements

### Requirement: Selection format query
`getSelectionFormat` SHALL return per mark `all` | `none` | `some`, with resolved values (size in px) when uniform, `lineHeight`, paragraph `align` (`all` | `none` | `some` with the value when uniform), list kind and depth, and `indent`, describing the paragraph depth of the plain (non-list) blocks in the range: `state` `all` when every plain block has depth > 0, `none` when all have depth 0 or the range has no plain block, `some` otherwise, with `depth` present when all plain blocks share the same depth. `indent` SHALL NOT include list blocks and `list` SHALL NOT include plain blocks.

#### Scenario: Mixed
- **WHEN** only part of the selection is bold
- **THEN** bold is `some`

#### Scenario: Uniform indent
- **WHEN** the selection covers two plain paragraphs, both with depth 1
- **THEN** `indent` is `{ state: 'all', depth: 1 }`

#### Scenario: Partly indented
- **WHEN** one of two plain paragraphs is indented
- **THEN** `indent.state` is `some`

#### Scenario: Lists only
- **WHEN** the selection covers only list items
- **THEN** `indent.state` is `none` and `list` reports their kind and depth
