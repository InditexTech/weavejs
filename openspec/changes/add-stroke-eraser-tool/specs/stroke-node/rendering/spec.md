# Spec Delta

## ADDED Requirements

### Requirement: Public rendered geometry
The stroke node SHALL expose, for a stroke, the centerline and the half-width at each of its points as the renderer uses them, for strokes with a look and strokes without one, at the current zoom. The result SHALL be the one that is drawn, so that other features can work on the drawn shape. It SHALL also give the geometry the stroke would have with other points or with another look, so that a change to a stroke can be measured before it is made.

#### Scenario: Look stroke
- **WHEN** the geometry of a stroke with a look is requested
- **THEN** it equals the centerline and widths used to draw it

#### Scenario: Legacy stroke
- **WHEN** the geometry of a stroke with no look is requested
- **THEN** it equals the centerline and widths of the legacy ribbon

#### Scenario: Other points or another look
- **WHEN** the geometry is requested for other points, or for another look
- **THEN** it is the geometry the stroke would be drawn with them

### Requirement: Saved erasures are clipped out of the stroke
When a stroke has `erasures`, the renderer SHALL draw the stroke as it always draws it, with the area of each erasure clipped out, in every draw path: the legacy ribbon with and without a look, and the round outline. The holes SHALL be applied however they overlap. A stroke with no erasure, or none that reaches its ink, SHALL be drawn exactly as before. Entries of `erasures` that are not well formed SHALL be left out, and the stroke SHALL be drawn with the rest.

#### Scenario: Erased middle
- **WHEN** an erasure covers the middle of a stroke
- **THEN** the covered part is not drawn and the rest is drawn as it was, to the edge of the erasure

#### Scenario: Overlapping erasures
- **WHEN** two erasures overlap
- **THEN** the union of both is clear, and nothing in the overlap shows

#### Scenario: Nothing reached
- **WHEN** the erasures of a stroke do not reach it
- **THEN** it is drawn exactly as without them

#### Scenario: Malformed entry
- **WHEN** an entry of `erasures` has no points, a radius that is not positive, or numbers that are not finite
- **THEN** that entry is ignored and the stroke draws

#### Scenario: Translucent colour
- **WHEN** a translucent stroke is drawn with erasures
- **THEN** every pixel outside the erased area has the alpha it has without them

### Requirement: Non-serialized erase mask
The stroke node SHALL support a local erase mask: a list of erasures in the node's own coordinates, applied with the saved ones, while a drag with the eraser goes on. The mask SHALL NOT be written to the document, SHALL NOT be sent to other users and SHALL NOT appear in the serialized node. Setting the mask to nothing SHALL draw the stroke as it is saved.

#### Scenario: Mask on
- **WHEN** a mask covers the middle of a stroke
- **THEN** the covered part is not drawn and the rest is drawn as before

#### Scenario: Serialize
- **WHEN** a node with a mask is serialized
- **THEN** the result has no mask, and has the saved erasures

#### Scenario: Mask removed
- **WHEN** the mask is cleared
- **THEN** the stroke is drawn as it is saved

### Requirement: The box and the pick area follow what is left
When a stroke has saved erasures, its box in its own space (what a frame, snapping, aligning, fitting and an export read) SHALL be that of what is left to see, and the area it can be picked in SHALL be that box with the width of the stroke round it. Erasing only the middle of a stroke SHALL leave both as they were. A stroke with nothing left to see SHALL keep its box. The local erase mask SHALL NOT change either.

#### Scenario: End erased
- **WHEN** the end of a stroke is erased
- **THEN** its frame ends where the ink does, and a click on the erased end does not pick it

#### Scenario: Middle erased
- **WHEN** only the middle of a stroke is erased
- **THEN** its frame and its pick area are those of the whole stroke

#### Scenario: Erasures change
- **WHEN** an erasure is added or the zoom changes
- **THEN** the box is worked out again, and otherwise it is kept

### Requirement: A resize moves the erasures with the stroke
When the stroke bakes a resize into its points, it SHALL scale its erasures by the same factors: the paths and the axes along each axis, and the radius of a circle by the mean of the two.

#### Scenario: Uniform resize
- **WHEN** an erased stroke is resized to one and a half times its size
- **THEN** every path is one and a half times as far from the origin and every radius one and a half times as large

#### Scenario: Stretched
- **WHEN** an erased stroke is stretched along one axis
- **THEN** the paths and the axes of squares follow each axis, and a circle takes the mean of the two scales
