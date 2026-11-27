# Spec Delta

## Purpose

Defines the stroke eraser action: a drag tool that erases an area of stroke nodes with a screen-sized eraser, previews the result locally and commits it as one undoable step.

## ADDED Requirements

### Requirement: Separate action
The system SHALL provide a `strokeEraserTool` action that is separate from `eraserTool`. The behaviour of `eraserTool` SHALL NOT change, and the new action SHALL be available only when a host registers it.

#### Scenario: Existing eraser
- **WHEN** a host registers only `eraserTool`
- **THEN** clicking a node still removes the whole node, as before

#### Scenario: Not registered
- **WHEN** a host does not register `strokeEraserTool`
- **THEN** no stroke is ever split by any existing action

### Requirement: Only stroke nodes are erased
The action SHALL erase only nodes of type `stroke`. Every other node type, including `stroke-single`, SHALL be left untouched, however the eraser path crosses it. Strokes flagged `isEraser` SHALL be treated like any other stroke.

#### Scenario: Other node under the eraser
- **WHEN** the eraser path crosses a rectangle and a stroke
- **THEN** only the stroke is changed

#### Scenario: Single-line stroke
- **WHEN** the eraser path crosses a `stroke-single` node
- **THEN** the node is unchanged

### Requirement: Eraser size in screen pixels
The eraser size SHALL be set in screen pixels and converted to canvas units with the stage zoom at each pointer sample, so the eraser covers the same screen area at any zoom. The action SHALL show a ring cursor of that size on the utility layer.

#### Scenario: Zoomed in
- **WHEN** the stage is at 4x zoom and the eraser is 20 px
- **THEN** the erased radius is 10 px on screen, which is 2.5 canvas units

#### Scenario: Zoom changes between samples
- **WHEN** the zoom changes during a drag
- **THEN** each sample uses the zoom in force at that sample

### Requirement: Continuous eraser path
The eraser path SHALL be the union of capsules (a segment between consecutive pointer samples plus the radius), so a fast drag does not skip a stroke between two samples.

#### Scenario: Fast drag
- **WHEN** two consecutive samples are far apart and a thin stroke crosses the line between them
- **THEN** the stroke is cut where it crosses that line

### Requirement: Cut where the stroke is drawn
The system SHALL decide what to erase using the centerline and half-widths the stroke is drawn with, for strokes with a look and for strokes without one, and not the stored control points. For a stroke with round ends, a point of the stroke SHALL be erased when its distance to the eraser path is below the eraser radius plus the half-width at that point, so a round end left by the cut does not overlap the erased area. For a stroke with flat ends, a point SHALL be erased when the eraser path comes within the eraser radius of the drawn cross-section of the stroke at that point, so a square end left by the cut touches the erased area and the eraser has no effect beyond the start or end of the stroke.

#### Scenario: Wide stroke
- **WHEN** the eraser edge touches the drawn outline of a wide stroke without reaching its centerline
- **THEN** that part of the stroke is erased

#### Scenario: Round end of a piece
- **WHEN** a stroke with round ends is cut and a piece is left with a round end
- **THEN** the drawn end does not overlap the erased area

#### Scenario: Flat end of a piece
- **WHEN** a stroke with flat ends is cut
- **THEN** the square end of each piece touches the erased area and no more of the stroke is erased than the eraser covers

#### Scenario: Eraser past a flat end
- **WHEN** the eraser stops short of the start or end of a stroke with flat ends, closer than a half-width but farther than its radius
- **THEN** the stroke is unchanged

### Requirement: Local preview
While the pointer is down the system SHALL show the erased parts as removed on the local screen only. The preview SHALL NOT write to the shared document, SHALL NOT be sent to other users and SHALL NOT be included when the node is serialized.

#### Scenario: Dragging
- **WHEN** a user drags over a stroke
- **THEN** the covered part disappears from their screen and the document is unchanged

#### Scenario: Other user
- **WHEN** a user is dragging and a second user watches the same room
- **THEN** the second user sees no change until the commit

#### Scenario: Preview matches commit
- **WHEN** the user releases the pointer
- **THEN** the committed pieces cover exactly what the preview showed

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
- **WHEN** one drag cuts three strokes
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
- **THEN** their pieces can overlap, which is a documented limitation

### Requirement: Default finalize configuration
Surviving points SHALL be reduced with the finalize stage the brush tool uses. The default SHALL be a pressure-aware simplification with its tolerance in screen pixels at the zoom of the stroke at the commit, kept within a quarter of a screen pixel of the line the piece was cut from (see `brush-tool/finish-fidelity`), and a host SHALL be able to override it through the action's props. The work of keeping pieces within the bound SHALL share one time budget for the whole erase; once it is spent the remaining pieces SHALL be saved as the finishing step leaves them.

#### Scenario: Default
- **WHEN** no override is given
- **THEN** pieces are simplified with the default and stay within the bound of the cut curve

#### Scenario: Override
- **WHEN** a host sets a different finalize configuration
- **THEN** pieces are simplified with it

#### Scenario: Many strokes in one erase
- **WHEN** one erase changes so many strokes that keeping them all within the bound takes longer than the budget
- **THEN** the release of the pointer is not held up beyond it and the remaining pieces are saved as the finishing step leaves them

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
The system SHALL NOT erase a stroke again until the host has taken what the last erase wrote to it, or the wait for it is over, so that a preview is never made for the points the stroke had before.

#### Scenario: A quick second erase
- **WHEN** a second erase begins over a stroke before the host has taken the first
- **THEN** the stroke is not erased by the second, and is again once the first has landed

### Requirement: The preview does not slow as a drag goes on
The cost of showing the erase SHALL depend on the capsules added since the last step, not on all the capsules of the drag.

#### Scenario: A long scrub
- **WHEN** an eraser is dragged back and forth over one stroke for hundreds of steps
- **THEN** each step costs about what the first did
