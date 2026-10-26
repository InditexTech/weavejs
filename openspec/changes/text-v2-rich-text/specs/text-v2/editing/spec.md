## ADDED Requirements

### Requirement: Format shortcuts and commands in session
When rich text is enabled for the node, Ctrl/Cmd+B, I and U SHALL toggle marks on the selection or stored marks, and each format command SHALL be exactly one session-undo entry. The proxy textarea SHALL keep stopping keydown propagation so app-level undo does not fire.

#### Scenario: Undo format
- **WHEN** a format command is applied then undone
- **THEN** content and selection are restored

### Requirement: List key rules
When rich text is enabled for the node, Enter SHALL continue a list item, Enter on an empty item SHALL exit the list, Backspace at item start SHALL outdent or remove the marker, and Tab / Shift+Tab SHALL change depth.

#### Scenario: Empty item
- **WHEN** Enter is pressed in an empty list item
- **THEN** the block becomes a plain paragraph

### Requirement: Enter keeps structure when disabled
With rich text disabled for the node, Enter in a list item SHALL create a block copying `kind` and `depth`; no format commands or shortcuts SHALL be active.

#### Scenario: Flag off
- **WHEN** Enter is pressed in a list item with the flag off
- **THEN** the new block has the same `kind` and `depth`

### Requirement: Plain paste inherits marks
Paste SHALL insert plain text with the marks at the caret.

#### Scenario: Paste in bold text
- **WHEN** text is pasted inside bold text
- **THEN** it is bold

### Requirement: One Weave undo step
Commit on exit SHALL remain a single `updateNode`, skipped when content is unchanged.

#### Scenario: Many formats
- **WHEN** several format commands run in one session
- **THEN** exit produces one Weave undo step
