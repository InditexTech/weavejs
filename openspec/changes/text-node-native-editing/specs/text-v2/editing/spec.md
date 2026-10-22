## ADDED Requirements

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
While editing, the node SHALL draw an outline of the text box on the utility layer, configurable through `edition.outline` (`enabled`, `color`, `width` in screen pixels; defaults `true`, `#0074ff`, `1`). `edition.borderSize` SHALL NOT exist in the text-v2 config.

#### Scenario: Defaults
- **WHEN** a session starts with no outline config
- **THEN** a 1px `#0074ff` outline surrounds the box, including fixed width/height boxes

#### Scenario: Disabled
- **WHEN** `edition.outline.enabled` is `false`
- **THEN** no outline is drawn
