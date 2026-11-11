## Purpose

Defines the opt-in rich text API of `WeaveTextV2Node`: configuration, text tool, formatting commands, links, alignment, line height, selection query and events.

## Requirements

### Requirement: Opt-in config
Rich text SHALL be enabled per node by the boolean attribute `richText`; a node without it SHALL follow `config.richText.enabled` (default false). `WeaveTextV2Node` SHALL accept `config.richText` with `enabled` and `indentStep` (multiple of base `fontSize`, default 1.5; values <= 0 or NaN fall back to the default; must match across clients). When disabled, commands SHALL be no-ops and no formatting UI behavior is active.

#### Scenario: Per-node attribute
- **WHEN** a node has `richText: true` and the config is off (or the reverse)
- **THEN** the attribute decides whether commands and shortcuts work

#### Scenario: Disabled
- **WHEN** a command is called with `richText.enabled` false
- **THEN** nothing changes

### Requirement: Text tool creates rich nodes
`WeaveTextToolAction` SHALL accept optional `name` and `props`, so two tool instances can create plain and rich text nodes (`props: { richText: true }`). Defaults SHALL be unchanged.

#### Scenario: Second tool
- **WHEN** a tool is created with `{ name: 'richTextTool', props: { richText: true } }`
- **THEN** it has that name and the nodes it creates carry `richText: true`

### Requirement: Commands
The node SHALL expose `applyMark`, `toggleMark`, `toggleList`, `indent`, `outdent` and `setBaseFontSize`, working in an active session and on a selected non-editing node (whole text or a given range). Outside a session each call SHALL be one `updateNode`. Font sizes SHALL be px at the API and converted to ratios internally.

#### Scenario: Modal edit
- **WHEN** a command targets a non-editing node
- **THEN** the text updates with one undo step

#### Scenario: Size round trip
- **WHEN** size 24 is applied on base 16 and queried
- **THEN** 24 is returned, rounded to 0.1

### Requirement: Run links
The node SHALL expose `setRunLink` and `removeRunLink` (and `applyMark(node, 'link', url)`), accepting only absolute http(s) URLs. Ctrl/Cmd+click on a link run, or a click on an already-selected node after the double-click window, SHALL open the URL in a new tab with `noopener,noreferrer`.

#### Scenario: Unsafe URL rejected
- **WHEN** `setRunLink` receives `javascript:alert(1)`
- **THEN** it returns false and nothing changes

#### Scenario: Open
- **WHEN** the user Ctrl/Cmd+clicks a link run
- **THEN** the URL opens in a new tab

### Requirement: Alignment and line height commands
The node SHALL expose `setAlign(node, align, range?)` (every paragraph touched by the range) and accept `lineHeight` in `applyMark`. They SHALL follow the same rules as other commands: gated by rich text, one session-undo entry while editing, one `updateNode` otherwise. A whole-node `align` or `lineHeight` change SHALL NOT clear paragraph or run overrides.

#### Scenario: Align a selection
- **WHEN** `setAlign(node, 'center', range)` covers two paragraphs
- **THEN** both are centered

### Requirement: Selection format query
`getSelectionFormat` SHALL return per mark `all` | `none` | `some`, with resolved values (size in px) when uniform, `lineHeight`, paragraph `align` (`all` | `none` | `some` with the value when uniform), and list kind and depth.

#### Scenario: Mixed
- **WHEN** only part of the selection is bold
- **THEN** bold is `some`

### Requirement: Events
The node SHALL emit `onTextSelectionChange` (throttled) and `onTextFormatChange` after commands, undo and redo, with `reason: 'base-size'` for base size changes.

#### Scenario: Toolbar sync
- **WHEN** the selection moves in a session
- **THEN** `onTextSelectionChange` fires with the format
