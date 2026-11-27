# Spec Delta

## Purpose

Defines what an erase saves on a stroke and what is left of it: the stroke as it was drawn, to the edge of the eraser, kept in a small, ordinary field of the stroke, so that the stroke stays one node, is undone as one step, and follows the changes made to it.

## ADDED Requirements

### Requirement: A stroke is not cut
An erase SHALL be saved on the stroke as its `erasures`, and SHALL NOT change anything else of it: the id, the position, rotation and scale, the box, the points, the look, the colour, the width, the dash, the opacity, the blend mode, `inputMeta`, and the place of the node in its parent. The system SHALL NOT split a stroke into several nodes, and SHALL NOT add a required field to stroke data.

#### Scenario: Middle erased
- **WHEN** the middle of a stroke is erased
- **THEN** the stroke keeps its id, its points and its place in the stack, its `erasures` has one more entry, and no node is added

#### Scenario: Everything else as it was
- **WHEN** a stroke is erased
- **THEN** every saved property other than `erasures` is equal to what it was before the erase

#### Scenario: Untouched document
- **WHEN** a document has no erased stroke
- **THEN** no stored data differs from before

### Requirement: What is left is the stroke as drawn, to the edge of the eraser
What is left of an erased stroke SHALL be the stroke as it was drawn, with exactly the area the eraser covered removed. The edge of the erase SHALL be the edge of the eraser: an arc of the circle, or the sides of the square, or, for a drag, the edge of the area swept. The ink next to the edge, corners included, SHALL be as it was: the erase SHALL NOT add a round or a square end, shorten the line past the eraser, or change the width, taper, opacity or look of what is left, and SHALL NOT change a pixel outside the area the eraser covered. A stroke that the eraser does not cover across its whole width SHALL keep the part it did not cover.

#### Scenario: A click with a circle
- **WHEN** a circular eraser wider than a stroke is clicked on it
- **THEN** the stroke has a circular bite, whose edge is the circle, with the corners of the ink on both sides intact

#### Scenario: A drag across a line
- **WHEN** a circular eraser is dragged straight across a line
- **THEN** the gap has straight sides, the width of the eraser apart, and the ends of the line are cut square to the drag

#### Scenario: A diagonal drag
- **WHEN** an eraser is dragged across a line at an angle
- **THEN** the edges of the gap follow the drag, at that angle, with sharp corners

#### Scenario: A square
- **WHEN** a square eraser is clicked on a stroke
- **THEN** the hole has square corners and straight sides, parallel to the edges of the screen

#### Scenario: A thin eraser on a broad stroke
- **WHEN** an eraser narrower than a stroke is dragged along its middle
- **THEN** a channel is taken out of the middle and the ink on both sides stays

#### Scenario: Outside the eraser
- **WHEN** a stroke is erased
- **THEN** no pixel outside the eraser, the edge of the cut included, differs from the stroke before

#### Scenario: Translucent and blended strokes
- **WHEN** a translucent stroke, or one with a blend mode, is erased
- **THEN** what is left has the opacity and the blending it had

### Requirement: Erasures are saved small, in the space of the stroke
Each erasure SHALL be one stretch of a drag over the stroke, in the space of the stroke node: a circle with its radius, or a square with the vectors from its centre to the middle of two neighbouring sides, and the path of its centre. The path SHALL be reduced so that no sample of the drag is farther than a tenth of a screen pixel from it, and its numbers SHALL be rounded to a thousandth. A stretch SHALL end when the size or shape of the eraser changes, as with a change of zoom.

#### Scenario: Straight drag
- **WHEN** an eraser is dragged straight over a stroke with many samples
- **THEN** the saved path has two points

#### Scenario: Click
- **WHEN** an eraser is clicked
- **THEN** the saved path is one point

#### Scenario: Curved drag
- **WHEN** an eraser is dragged along a curve
- **THEN** no sample of the drag is farther than a tenth of a screen pixel from the saved path

#### Scenario: Zoom changes in a drag
- **WHEN** the zoom changes during a drag over a stroke
- **THEN** the stretches before and after it are separate erasures, each with its own size

#### Scenario: Turned stroke
- **WHEN** a square eraser is used on a stroke rotated by 25 degrees
- **THEN** the saved axes are those of a screen-aligned square in the space of the stroke, and the hole is a screen-aligned square on screen

### Requirement: Erasures are added, and undone, together
An erase SHALL add its erasures to those the stroke already has, leaving them as they were. All the erasures of one gesture SHALL be written in one step.

#### Scenario: A second erase
- **WHEN** a stroke that was erased is erased again
- **THEN** its earlier erasures are unchanged and the new ones follow them

#### Scenario: Undo
- **WHEN** a gesture is undone
- **THEN** the stroke has the erasures it had before the gesture, and redo gives them again

### Requirement: Erasures follow the stroke
An erase SHALL stay where it was made on the stroke when the stroke is moved, rotated, grouped, or resized. When a resize bakes its scale into the points of the stroke, the erasures SHALL be scaled with them: the paths and the axes by the scale along each axis, and the radius of a circle by the mean of the two.

#### Scenario: Moved or rotated
- **WHEN** an erased stroke is moved or rotated
- **THEN** the hole moves and turns with it

#### Scenario: Resized
- **WHEN** an erased stroke is resized
- **THEN** its erasures are scaled with its points and the hole is where it was on the stroke

### Requirement: A stroke with nothing left is removed
When no part of a stroke is left to see after an erase, the stroke SHALL be removed in the same step. A part SHALL count as left to see unless samples across its width, a screen pixel apart or closer, are all inside the erasures, so that a sliver which shows is never taken for nothing.

#### Scenario: Whole stroke covered
- **WHEN** the eraser covers a whole stroke
- **THEN** the stroke is removed

#### Scenario: Covered by several passes
- **WHEN** several drags together cover the whole width and length of a broad stroke
- **THEN** the stroke is removed

#### Scenario: A sliver is left
- **WHEN** two passes leave a gap of two pixels in the width of a stroke
- **THEN** the stroke is not removed

### Requirement: A drag that touches no ink writes nothing
A stroke SHALL be written only when the eraser reaches its ink, as far as its centerline and widths tell, with a margin of a pixel; a drag that only crosses the box of a stroke SHALL NOT change it. This SHALL hold for strokes with few points, such as a straight line of two.

#### Scenario: Box only
- **WHEN** the eraser goes by a corner of the box of a diagonal line without touching it
- **THEN** nothing is written for that stroke

#### Scenario: Straight line with two points
- **WHEN** the eraser crosses the middle of a straight stroke that has only its two end points
- **THEN** the stroke is erased there

### Requirement: Documented limits
Four effects of this way of saving an erase SHALL be documented and SHALL be accepted: a viewer of a release before this one does not know `erasures` and draws the stroke in full, a server-side renderer included; what was erased stays in the saved data of the stroke; a stroke erased in two places is still one node, so its parts cannot be moved apart; and an eraser that does not cover the whole width of a stroke leaves a sliver of the rest.

#### Scenario: Older viewer
- **WHEN** a viewer of an earlier release opens a document with erased strokes
- **THEN** it draws those strokes without the erase and does not fail

#### Scenario: A sliver
- **WHEN** an eraser of 24 pixels is dragged along a stroke 22 pixels wide, a pixel off its middle
- **THEN** a sliver of the stroke the eraser did not cover is left
