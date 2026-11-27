# Spec Delta

## Purpose

Defines the stroke eraser action: a drag tool that erases an area of stroke nodes with a screen-sized circle or square, previews the result locally and commits it as one undoable step.

## ADDED Requirements

### Requirement: Separate action
The system SHALL provide a `strokeEraserTool` action that is separate from `eraserTool`. The behaviour of `eraserTool` SHALL NOT change, and the new action SHALL be available only when a host registers it.

#### Scenario: Existing eraser
- **WHEN** a host registers only `eraserTool`
- **THEN** clicking a node still removes the whole node, as before

#### Scenario: Not registered
- **WHEN** a host does not register `strokeEraserTool`
- **THEN** no stroke is ever erased by any existing action

### Requirement: Only stroke nodes are erased
The action SHALL erase only nodes of type `stroke`. Every other node type, including `stroke-single`, SHALL be left untouched, however the eraser path crosses it. Strokes flagged `isEraser` SHALL be treated like any other stroke.

#### Scenario: Other node under the eraser
- **WHEN** the eraser path crosses a rectangle and a stroke
- **THEN** only the stroke is changed

#### Scenario: Single-line stroke
- **WHEN** the eraser path crosses a `stroke-single` node
- **THEN** the node is unchanged

### Requirement: Eraser size and shape
The eraser SHALL be a circle or a square, set by the `shape` prop (default `circle`), and its size SHALL be set by the `size` prop in screen pixels (default 24): the diameter of a circle, the side of a square. The size SHALL be converted to canvas units with the stage zoom at each pointer sample, so the eraser covers the same screen area at any zoom. A square SHALL stay aligned with the screen whatever the rotation or scale of the stroke it erases. Either prop SHALL be changeable at any time with `updateProps`, including while the tool is in use, and a value that is not valid SHALL be replaced by its default. The action SHALL show a ring cursor of the shape and size on the utility layer, and the ring SHALL follow a change of either prop at once.

#### Scenario: Zoomed in
- **WHEN** the stage is at 4x zoom and a circular eraser is 20 px
- **THEN** the erased radius is 10 px on screen, which is 2.5 canvas units

#### Scenario: Zoom changes between samples
- **WHEN** the zoom changes during a drag
- **THEN** each sample uses the zoom in force at that sample

#### Scenario: A square
- **WHEN** the shape is `square` and the size 20 px
- **THEN** the eraser is a square of 20 screen pixels on a side, with its sides parallel to the edges of the screen

#### Scenario: Changing the shape in use
- **WHEN** `updateProps` sets the shape to `square` while the tool is active
- **THEN** the ring becomes a square at once, at the same place, and the next sample erases with a square

#### Scenario: Not valid
- **WHEN** a size that is not a positive number or an unknown shape is set
- **THEN** the default size and the circle are used

### Requirement: Continuous eraser path
The area the eraser erases SHALL be the area it sweeps between consecutive pointer samples (a capsule for a circle, a hexagon for a square), so a fast drag does not skip a stroke between two samples.

#### Scenario: Fast drag
- **WHEN** two consecutive samples are far apart and a thin stroke crosses the line between them
- **THEN** the stroke is erased where it crosses that line

### Requirement: Local preview
While the pointer is down the system SHALL show the erased parts as removed on the local screen only, drawn by the same code that draws the saved erase. The preview SHALL NOT write to the shared document, SHALL NOT be sent to other users and SHALL NOT be included when the node is serialized.

#### Scenario: Dragging
- **WHEN** a user drags over a stroke
- **THEN** the covered part disappears from their screen and the document is unchanged

#### Scenario: Other user
- **WHEN** a user is dragging and a second user watches the same room
- **THEN** the second user sees no change until the commit

#### Scenario: Preview matches commit
- **WHEN** the user releases the pointer
- **THEN** the saved erase covers what the preview showed, to within a tenth of a screen pixel

### Requirement: Commit on release, cancel with Escape
The system SHALL commit the erase when the pointer is released and SHALL discard it, leaving every stroke as it was, when the user presses Escape during the drag.

#### Scenario: Release
- **WHEN** the user releases the pointer after erasing part of a stroke
- **THEN** the document is updated once

#### Scenario: Escape
- **WHEN** the user presses Escape during the drag
- **THEN** the preview is removed and nothing is written

#### Scenario: Nothing touched
- **WHEN** the user releases without the eraser touching any stroke
- **THEN** nothing is written

### Requirement: One undo step
All changes of one gesture SHALL be written in a single transaction, so one undo restores every stroke the gesture changed.

#### Scenario: Several strokes
- **WHEN** one drag erases part of three strokes
- **THEN** one undo restores all three

### Requirement: Locked strokes are skipped
The system SHALL NOT change a stroke that is `locked` or that is mutex-locked by another user, and SHALL NOT show it as erased. The system SHALL take a mutex lock on the strokes it changes around the commit and release it afterwards.

#### Scenario: Locked stroke
- **WHEN** the eraser crosses a locked stroke
- **THEN** the stroke is unchanged and shows no preview

#### Scenario: Locked by another user
- **WHEN** another user holds the mutex lock of a stroke
- **THEN** the stroke is unchanged

#### Scenario: Concurrent erase
- **WHEN** two users erase the same stroke within the lock propagation latency
- **THEN** one of the two erases can be lost, which is a documented limitation

### Requirement: Finger and pen input
The system SHALL stop the browser from scrolling or zooming the page under a finger or pen that drags while the tool is active, and SHALL restore the setting when the tool is left. Only the pointer that began an erase SHALL move, commit or cancel it. When a pinch begins the erase SHALL be dropped, and no erase SHALL begin while a pinch is under way. A pointer that the browser cancels SHALL drop the erase without writing it.

#### Scenario: A finger drags
- **WHEN** a finger drags over a stroke
- **THEN** the page does not scroll and the stroke is erased as with a mouse

#### Scenario: A second finger
- **WHEN** a second finger moves or lifts during an erase
- **THEN** the erase is not changed or ended by it

#### Scenario: A pinch
- **WHEN** a pinch begins during an erase
- **THEN** the erase is dropped and nothing is written

#### Scenario: The browser cancels the pointer
- **WHEN** the browser cancels the pointer that is erasing
- **THEN** the previews are removed and nothing is written

### Requirement: A failed write leaves nothing behind
When writing an erase fails, the system SHALL remove the previews, SHALL NOT leave any stroke locked, SHALL report the failure, and SHALL be ready for the next erase.

#### Scenario: The document cannot be written
- **WHEN** the write of an erase fails
- **THEN** every stroke is drawn in full again, no lock is held, and the next erase works

### Requirement: A stroke is not erased again while its last erase is landing
The system SHALL NOT erase a stroke again until the host has taken what the last erase wrote to it, or the wait for it is over, so that a preview is never made on a stroke that is about to change.

#### Scenario: A quick second erase
- **WHEN** a second erase begins over a stroke before the host has taken the first
- **THEN** the stroke is not erased by the second, and is again once the first has landed
