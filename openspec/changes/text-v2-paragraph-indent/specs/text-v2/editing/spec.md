## ADDED Requirements

### Requirement: Paragraph indent keys
When rich text is enabled for the node, Tab SHALL increase the depth of every plain paragraph touched by the selection by one, and Shift+Tab SHALL decrease it by one, with no effect at depth 0. A collapsed caret SHALL indent the line's whole paragraph. Backspace with a collapsed selection at the start of a plain paragraph with `depth > 0` SHALL decrease its depth by one and not delete any character; at depth 0 Backspace SHALL keep its existing behavior. List key behavior SHALL be unchanged.

#### Scenario: Tab on a caret
- **WHEN** Tab is pressed with the caret in a plain paragraph
- **THEN** the whole paragraph is indented one level and the caret stays in the same text position

#### Scenario: Tab on a multi-paragraph selection
- **WHEN** a selection spans three plain paragraphs and Tab is pressed
- **THEN** all three are indented one level

#### Scenario: Selection mixing lists and paragraphs
- **WHEN** a selection covers a list item and a plain paragraph and Tab is pressed
- **THEN** each block's `depth` increases by one

#### Scenario: Shift+Tab
- **WHEN** Shift+Tab is pressed in a paragraph with depth 2
- **THEN** its depth becomes 1; at depth 0 nothing changes

#### Scenario: Backspace at paragraph start
- **WHEN** Backspace is pressed at the start of a paragraph with depth 1
- **THEN** the paragraph returns to depth 0 and no text is merged or removed

#### Scenario: Backspace at depth 0
- **WHEN** Backspace is pressed at the start of a plain paragraph with depth 0
- **THEN** it merges with the previous paragraph as before

#### Scenario: Undo
- **WHEN** an indent is applied and then undone
- **THEN** the previous depth and the selection are restored

### Requirement: Indent persists across edits
A paragraph's `depth` SHALL be kept when its text is edited and SHALL be copied to the block created by Enter, regardless of `richText.enabled`. An empty indented plain paragraph SHALL stay indented (it does not exit anything).

#### Scenario: Enter in an indented paragraph
- **WHEN** Enter is pressed in the middle of a paragraph with depth 1
- **THEN** both resulting paragraphs have depth 1

#### Scenario: Typing
- **WHEN** text is typed in an indented paragraph
- **THEN** its depth is unchanged
