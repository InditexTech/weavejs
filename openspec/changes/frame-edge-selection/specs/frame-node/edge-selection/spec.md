# Spec Delta

## Purpose

Lets users select and move a frame (artboard) by clicking its title strip or any of its edges, with a click target that stays usable when zoomed out.

## ADDED Requirements

### Requirement: Frame is selectable from any edge
The system SHALL treat the frame's title strip and all four edges (top, right, bottom, left) as selectable regions of the frame. Clicking any of them SHALL select the frame, and dragging from them SHALL move it, exactly as the title strip does today.

#### Scenario: Click on an edge
- **WHEN** the user clicks within the edge band on any of the four sides of an unselected frame
- **THEN** the frame becomes selected

#### Scenario: Drag from an edge
- **WHEN** the user presses on an edge band and drags
- **THEN** the frame moves with the pointer

#### Scenario: Title strip unchanged
- **WHEN** the user clicks the title strip
- **THEN** the frame is selected as before

### Requirement: Frame interior is not selectable
The system SHALL NOT select the frame when the user clicks its empty interior, away from the edge bands and the title strip. Children of the frame SHALL keep receiving their own pointer interactions.

#### Scenario: Click on empty interior
- **WHEN** the user clicks an empty area inside the frame, outside the edge bands
- **THEN** the frame is not selected

#### Scenario: Click on a child
- **WHEN** the user clicks a child node inside the frame
- **THEN** the child receives the interaction, not the frame

### Requirement: Edge band stays clickable at any zoom
The effective width of the edge band, in canvas units, SHALL be the greater of the frame's `borderWidth` and a configurable `edgeHitWidth` (screen pixels, default 6) divided by the current zoom. The band SHALL extend mostly outside the border (about two thirds outside, one third inside).

#### Scenario: Zoomed out
- **WHEN** the stage is zoomed to 10% and the user clicks 3 screen pixels outside the frame border
- **THEN** the frame is selected

#### Scenario: Zoomed in
- **WHEN** the stage is zoomed in so that `edgeHitWidth / zoom` is smaller than `borderWidth`
- **THEN** the band width equals `borderWidth`

#### Scenario: Zoom changes
- **WHEN** the user changes the stage zoom
- **THEN** the band width in canvas units is recomputed to keep its on-screen width

#### Scenario: Frame properties updated
- **WHEN** the frame's size or title changes
- **THEN** the title strip and edge bands match the new geometry at the current zoom

#### Scenario: Title position stable
- **WHEN** a frame is moved or updated at any zoom level
- **THEN** its title stays at the same offset above the frame

### Requirement: Move cursor while dragging
The system SHALL show the `move` (four-arrow) cursor while a frame is being dragged, and SHALL restore the regular cursor when the drag ends. The cursor SHALL NOT change to `move` on hover or on a click without drag.

#### Scenario: Drag a frame
- **WHEN** the user drags a frame from its title or an edge
- **THEN** the cursor is `move` for the whole drag

#### Scenario: Drag ends
- **WHEN** the user releases the pointer after dragging a frame
- **THEN** the cursor is no longer `move`

#### Scenario: Click without drag
- **WHEN** the user clicks the title or an edge without dragging
- **THEN** the cursor does not become `move`

### Requirement: Hover and selection feedback unchanged
The system SHALL NOT introduce frame-specific hover or selected colors; hover and selection feedback SHALL keep coming from the nodes-selection plugin, and the drop-target border color (`onTargetEnter`) SHALL keep working.

#### Scenario: Selected frame
- **WHEN** a frame is selected
- **THEN** it is outlined by the nodes-selection plugin like any other node

### Requirement: Drop-target outline has a constant on-screen width
While a node is dragged over a frame, the frame's drop-target outline SHALL be drawn with the same width as the selection outline (`transform.borderStrokeWidth`) and SHALL keep that width on screen at any zoom. When the drag leaves, the regular border width and zoom scaling SHALL be restored.

#### Scenario: Drop target at low zoom
- **WHEN** a node is dragged over a frame while the stage is zoomed out
- **THEN** the drop-target outline is as thick on screen as the selection outline

#### Scenario: Drag leaves
- **WHEN** the dragged node leaves the frame
- **THEN** the border returns to `borderWidth` and scales with zoom again
