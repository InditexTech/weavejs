# Spec Delta

## Purpose

Defines which documentation pages carry a live demo and what each must show, so every node, action, plugin and store page presents its behavior through a demo that follows the docs theme instead of a static screenshot.

## ADDED Requirements

### Requirement: One demo per page
Every node page, action page, plugin page and store page (including the stores overview) SHALL embed its own demo, except the non-visual `layer` and `stage` node pages. A node page and its matching action page SHALL NOT share one demo.

#### Scenario: Node and tool pages
- **WHEN** a reader opens the Ellipse node page and the Ellipse tool page
- **THEN** each shows a different demo, the node page manipulating an existing ellipse and the tool page creating one

#### Scenario: Non-visual pages
- **WHEN** a reader opens the `layer` or `stage` node page
- **THEN** the page is unchanged

### Requirement: No static screenshots on covered pages
A covered page SHALL NOT embed a PNG or GIF screenshot of the showcase; its media is the demo, and the demo's poster is the only raster image in the media slot. Media files no page references SHALL be removed.

#### Scenario: Replaced media
- **WHEN** a page's demo is added
- **THEN** the page no longer references its previous GIF or PNG and that file is deleted if no other page uses it

### Requirement: Demos show the page's own behavior
A demo SHALL show the behavior the page documents, using the showcase's look, and SHALL be grounded in the SDK source for that node, action or plugin.

#### Scenario: Tool page
- **WHEN** an action page documents a creation tool
- **THEN** its demo shows the tool being picked in the toolbar and used on the canvas, ending in the created node

#### Scenario: Plugin page
- **WHEN** a plugin page documents a canvas behavior such as snapping or panning
- **THEN** its demo shows that behavior happening, and each peer, guide or overlay it names is visible

### Requirement: Store demos keep the reference diagram
A store page SHALL show a system-flow demo above its existing mermaid diagram, and SHALL keep that diagram.

#### Scenario: WebSockets store page
- **WHEN** a reader opens the WebSockets store page
- **THEN** a demo shows an edit made by one client reaching another through the server, and the page still contains its mermaid diagram below

#### Scenario: Stores overview
- **WHEN** a reader opens the stores overview page
- **THEN** its demo shows the same edit reaching two clients and names the transports compared on the page

### Requirement: Every demo is recorded and verified
Each demo SHALL ship with a `BRIEF.md`, a `REHEARSAL.md` and a light and dark poster pair, SHALL pass the film gate at 960 and 390 pixel widths in both themes, and SHALL have a row in the documentation state ledger.

#### Scenario: Complete demo
- **WHEN** a demo is added
- **THEN** its folder holds the brief, the rehearsal record and both posters, the gate ends `rehearsal passed`, and the ledger names its page and sources

### Requirement: Posters regenerate from one command
The docs demos package SHALL provide a single command that exports the light and dark poster pair of every registered demo, and a scaffold command that creates a new demo's brief, rehearsal, component stub and registry entry.

#### Scenario: Regenerate posters
- **WHEN** a contributor runs the posters command
- **THEN** every registered demo's light and dark posters are rewritten in place and the command fails if any export fails

#### Scenario: Scaffold a demo
- **WHEN** a contributor runs the scaffold command with a demo name
- **THEN** the demo's brief and rehearsal templates, a component stub and a registry entry exist and the package still builds
