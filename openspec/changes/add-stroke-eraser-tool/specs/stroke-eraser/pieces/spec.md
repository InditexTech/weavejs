# Spec Delta

## Purpose

Defines how an erased stroke is split into pieces and what each piece keeps, so that pieces are ordinary stroke nodes that any viewer draws and that behave well in the document.

## ADDED Requirements

### Requirement: Pieces are ordinary strokes
Each surviving piece SHALL be a normal `stroke` node. The system SHALL NOT add a required field to stroke data, so a viewer that knows nothing of the eraser draws the pieces correctly.

#### Scenario: Older viewer
- **WHEN** a viewer of an earlier release opens a document with pieces
- **THEN** it draws them as strokes

#### Scenario: Untouched document
- **WHEN** a document has no erased stroke
- **THEN** no stored data differs from before

### Requirement: Identity and order
The first piece of a stroke SHALL keep the original node id and be written as an update of it. Every further piece SHALL get a new id and be inserted at the original position in the same parent, so the stacking order with respect to other nodes does not change. A stroke with no surviving piece SHALL be removed.

#### Scenario: Cut in the middle
- **WHEN** the middle of a stroke is erased
- **THEN** the original id stays on one piece, a second piece is added at the same z-index and the stroke has two pieces

#### Scenario: Whole stroke covered
- **WHEN** the eraser covers a whole stroke
- **THEN** the stroke is removed

#### Scenario: Inside a frame
- **WHEN** a stroke inside a frame is cut
- **THEN** the pieces are in the same frame

### Requirement: What a piece keeps
A piece SHALL keep the stroke colour, stroke width, opacity, blend mode, dash, `inputMeta`, `isEraser` flag, other node attributes and the look of the original, and the node's position, rotation and scale, so that where a piece is drawn does not change.

#### Scenario: Transformed stroke
- **WHEN** a rotated and scaled stroke is cut
- **THEN** the pieces are drawn exactly where the surviving parts were

#### Scenario: Highlighter
- **WHEN** a highlighter stroke is cut
- **THEN** the pieces keep its opacity and blend mode and do not overlap one another

### Requirement: Cut ends are not tapered
Where a piece ends at a cut, its look SHALL have a taper of 0 at that end. An end of a piece that is still the original start or end of the stroke SHALL keep the original taper. A stroke without a look is unchanged in this respect.

#### Scenario: Middle piece
- **WHEN** a piece has a cut at both ends
- **THEN** it has no start or end taper

#### Scenario: Tail removed
- **WHEN** only the end of a stroke with an end taper is erased
- **THEN** the remaining piece keeps its start taper and has no end taper

### Requirement: Pressure is kept at cuts
A piece SHALL have, at each cut end, a pressure interpolated from the original points on each side of the cut, so its width at the cut matches the original.

#### Scenario: Cut in a pressure change
- **WHEN** a cut falls where pressure changes
- **THEN** the end of the piece has the interpolated pressure

### Requirement: Piece box
Each piece SHALL have its own position, width and height so that the area it occupies and its selection box fit the piece, and its points SHALL be stored relative to it. A piece SHALL be at least as wide and high as the stroke width.

#### Scenario: Selecting a piece
- **WHEN** a user selects a piece
- **THEN** the selection box fits the piece and not the original stroke

### Requirement: A piece stays within a bound of the line it was cut from
The system SHALL keep each piece within a bound of the line it was cut from, so that what is left of a stroke does not visibly change when the erase is saved. The bound SHALL be that of `brush-tool/finish-fidelity` (a quarter of a screen pixel by default, for a thin line), measured with the look the piece will have: no taper at a cut end, and the id of the stroke.

#### Scenario: The middle is erased
- **WHEN** the middle of a wavy stroke is erased
- **THEN** the pieces are within the bound of the stroke they were cut from, along their length

#### Scenario: Without the bound
- **WHEN** the host sets the bound to 0
- **THEN** the pieces are simplified as the finishing step leaves them, which can move the line more

#### Scenario: A broad stroke
- **WHEN** a broad stroke is erased
- **THEN** its pieces may move more than a hairline's, up to four times the bound, and have fewer points

### Requirement: Short pieces are dropped
A piece too short to be seen SHALL NOT be created.

#### Scenario: Sliver
- **WHEN** the eraser leaves a sliver shorter than the visible threshold
- **THEN** no piece is created for it

### Requirement: Documented visual limits
Three effects of a split SHALL be documented and SHALL be accepted: the width variation of a look with `variance` is seeded from the node id and distance from the start, so a piece other than the one that holds the original start can show a different variation; the dash pattern of a dashed stroke restarts at the start of each piece; and the curve through the points of a piece ends where the piece ends, while the original goes on, so near a cut the line bends differently by a fraction of a pixel.

#### Scenario: Variance
- **WHEN** a stroke with variance is split
- **THEN** a piece with a new id can differ in width variation

#### Scenario: Dashes
- **WHEN** a dashed stroke is split
- **THEN** each piece starts its dash pattern anew

#### Scenario: Near a cut
- **WHEN** a stroke is cut
- **THEN** the line of a piece within 20 px of the cut can differ from the original by a fraction of a pixel, and elsewhere is within the bound
