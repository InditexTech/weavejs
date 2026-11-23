# Spec Delta

## Purpose

Defines how animated faux-UI demos behave on the published Weave.js documentation site: how pages embed them, how they play, theme and degrade, and what each demo must ship with, so docs show the real Weave look without static GIFs.

## ADDED Requirements

### Requirement: Declarative embedding
A documentation page SHALL embed a demo by marking an image block with the demo's name, and the site SHALL mount the matching demo into it without any per-page script reference; the block's image is the demo's poster.

#### Scenario: Placeholder on a nested page
- **WHEN** a page at any depth in the site contains an image block marked as a `weave-demo` for an existing demo
- **THEN** the demo renders inside that block, and its assets load from the site's UI asset root regardless of page depth

#### Scenario: Unknown demo name
- **WHEN** a block names a demo that does not exist, or its demo fails to load
- **THEN** the block keeps showing its poster image and the rest of the page is unaffected

### Requirement: Lazy mounting and playback control
Demos SHALL mount only when their placeholder approaches the viewport and SHALL pause playback while off-screen.

#### Scenario: Demo below the fold
- **WHEN** a page loads and a demo's placeholder is far below the viewport
- **THEN** the demo does not mount or play until the reader scrolls near it

#### Scenario: Scrolled out of view
- **WHEN** a playing demo leaves the viewport
- **THEN** its playback pauses and resumes when it returns

### Requirement: Reduced motion and no-script fallback
Each demo SHALL provide a static poster that is shown when the reader prefers reduced motion or when scripting is unavailable, and the poster SHALL tell the demo's story on its own.

#### Scenario: Reduced motion preference
- **WHEN** the reader's system requests reduced motion
- **THEN** the demo shows its poster and does not animate

#### Scenario: Scripting disabled
- **WHEN** the page is viewed without JavaScript
- **THEN** the demo's poster image is shown with descriptive alternative text

### Requirement: Theme following
Demos SHALL render in the docs' active light or dark theme and SHALL update immediately when the reader toggles the theme.

#### Scenario: Initial dark theme
- **WHEN** a page loads with the dark theme active
- **THEN** the demo renders with its dark look

#### Scenario: Toggle while playing
- **WHEN** the reader toggles the theme while a demo is playing
- **THEN** the demo switches look without restarting or remounting visibly

### Requirement: Format
A demo SHALL be authored at a 960x540 (16:9) design size by default, SHALL scale to the width of its container preserving aspect ratio, and SHALL have a transparent background with no backing plate. A demo MAY declare a different design size in its brief.

#### Scenario: Narrow container
- **WHEN** a demo is shown in a container narrower than its design width
- **THEN** it scales down proportionally with no cropping beyond its intended framing and no layout shift on mount

#### Scenario: Over page ground
- **WHEN** a demo is shown on either theme's page background
- **THEN** no opaque rectangle surrounds the product beyond the product's own surfaces

### Requirement: Weave look
Demos SHALL reproduce the visual identity of the Weave showcase frontend: its typeface, lucide icon set, colour tokens and square-cornered white vertical toolbar, with fonts served from the docs site itself.

#### Scenario: No third-party requests from demos
- **WHEN** a page with a demo is loaded
- **THEN** the demo's own scripts, styles and fonts are all requested from the docs site's origin, and the demo bundle adds no request to a third-party origin

#### Scenario: Toolbar fidelity
- **WHEN** the rectangle-tool demo is shown
- **THEN** its toolbar is vertical, square-cornered and white (light theme) with a tooltip to the right of the active button

### Requirement: Pilot demos
The site SHALL include a home-page hero demo and a rectangle-tool demo.

#### Scenario: Home hero
- **WHEN** a reader opens the home page
- **THEN** a looping demo shows two collaborators working on one canvas, framed in browser chrome that runs off an edge, ending where it began

#### Scenario: Rectangle tool page
- **WHEN** a reader opens the Rectangle Tool action page
- **THEN** a looping demo shows the tool being selected in the toolbar, a rectangle drawn by dragging on the canvas, and selection handles appearing, without window chrome, replacing the former GIF

### Requirement: Authoring contract per demo
Every demo SHALL ship with a brief that can be re-run to regenerate it, a rehearsal record of what was verified, and a poster image.

#### Scenario: Complete demo folder
- **WHEN** a demo is added to the repository
- **THEN** its folder contains `BRIEF.md`, `REHEARSAL.md`, the demo source and a poster image

### Requirement: Build integration
The docs build SHALL build the demos bundle before the site is generated, and a failure to build demos SHALL fail the docs build.

#### Scenario: Clean checkout build
- **WHEN** the docs build runs from a clean checkout
- **THEN** the demos bundle is produced and published with the site assets without manual steps

#### Scenario: Demo build error
- **WHEN** the demos package fails to compile
- **THEN** the docs build exits non-zero and no site is published
