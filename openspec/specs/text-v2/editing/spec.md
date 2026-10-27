## Purpose

Defines native on-canvas editing for `WeaveTextV2Node`: proxy input with canvas caret and selection, navigation, IME, plain-text clipboard, session undo, lifecycle, size warning, edit outline, and select-all on enter.

## Requirements

### Requirement: Native on-canvas editing
Editing SHALL use a hidden proxy textarea for typing, IME and clipboard, with caret and selection painted on the `utilityLayer`. No DOM overlay mimicking the text SHALL exist.

#### Scenario: Enter edit mode
- **WHEN** the user enters edit mode
- **THEN** a proxy input takes focus and caret is drawn on the utility layer

### Requirement: Pointer and keyboard navigation
The session SHALL support click, drag, double-click (word) and triple-click (paragraph) selection, arrows, home/end and up/down.

#### Scenario: Double-click
- **WHEN** the user double-clicks a word
- **THEN** the word is selected

### Requirement: IME composition
The session SHALL support IME composition and treat a composition as one undo entry.

#### Scenario: Compose text
- **WHEN** the user composes and commits text via IME
- **THEN** it is inserted and undo removes it in one step

### Requirement: Plain-text clipboard
Copy, cut and paste SHALL use plain text; bulk paste SHALL be one command with layout time-sliced.

#### Scenario: Large paste
- **WHEN** a large text is pasted
- **THEN** one undo entry is created and the UI stays responsive

### Requirement: Session-local undo
The session SHALL maintain undo/redo with coalescing (typing, delete, paste, IME each one entry), restoring selection. Native textarea undo SHALL be blocked and keydown SHALL NOT propagate to app-level undo while editing.

#### Scenario: Ctrl+Z while editing
- **WHEN** the user presses Ctrl/Cmd+Z in edit mode
- **THEN** only the session undoes and the Weave stage undo does not fire

### Requirement: Single commit on exit
Exiting edit mode SHALL commit via one `updateNode`, skipped if content is unchanged.

#### Scenario: No changes
- **WHEN** the user enters and exits without changes
- **THEN** no update is recorded

### Requirement: Lifecycle preserved
`WeaveTextV2Node` SHALL honour the `text-edit` mutex and `text-edition` stage mode, emit its own enter/exit edit-mode events whose `node` payload is the exported Shape type, support create-then-edit, and keep link and outline behavior.

#### Scenario: Create then edit
- **WHEN** the text-tool creates a node
- **THEN** it enters edit mode and emits the enter event

### Requirement: Size warning
The system SHALL emit `onTextSizeWarning` when serialized content exceeds a configurable threshold and SHALL NOT enforce a size cap.

#### Scenario: Over threshold
- **WHEN** content exceeds the threshold
- **THEN** the event is emitted and editing continues

### Requirement: Session independence
`TextEditSession` SHALL take a bounds provider and target, not `WeaveTextNode`.

#### Scenario: Reuse
- **WHEN** another node supplies a bounds provider and target
- **THEN** a session can edit it

### Requirement: Configurable edit outline
While editing, the node SHALL draw an outline of the text box on the utility layer, configurable through `edition.outline` (`enabled`, `color`, `width` and `padding` in screen pixels; defaults `true`, `#0074ff`, `1`, `0`). `edition.borderSize` SHALL NOT exist in the text-v2 config.

#### Scenario: Defaults
- **WHEN** a session starts with no outline config
- **THEN** a 1px `#0074ff` outline surrounds the box, including fixed width/height boxes

#### Scenario: Disabled
- **WHEN** `edition.outline.enabled` is `false`
- **THEN** no outline is drawn

#### Scenario: Padding
- **WHEN** `edition.outline.padding` is `6`
- **THEN** the outline is drawn 6 screen pixels outside the box on every side, at any zoom

### Requirement: Select all on enter
Entering edit mode on an existing node SHALL select all its content; a newly created node SHALL start with the caret.

#### Scenario: Edit existing text
- **WHEN** the user enters edit mode on a node with text
- **THEN** all text is selected and typing replaces it

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

### Requirement: Empty item keeps marks
Enter in a list item SHALL create a new item whose marker and empty line immediately use the previous item's marks (except `link`). Outdenting an empty item SHALL keep its marks. Enter on an empty item that exits the list SHALL clear them.

#### Scenario: New bullet
- **WHEN** Enter is pressed at the end of a bullet with size 2
- **THEN** the new bullet's marker and empty line render at size 2 with no jump on typing

#### Scenario: Outdent
- **WHEN** an empty item with marks is outdented
- **THEN** its marks are kept

#### Scenario: Exit list
- **WHEN** Enter is pressed in an empty item with marks
- **THEN** the block becomes a plain paragraph without `m`
