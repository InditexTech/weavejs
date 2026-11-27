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

### Requirement: Non-serialized erase mask
The stroke node SHALL support a local erase mask: a set of eraser capsules in the node's own coordinates, whose covered parts the renderer skips. The mask SHALL work for the legacy ribbon with and without a look and for the round outline, SHALL NOT be written to the document, SHALL NOT be sent to other users and SHALL NOT appear in the serialized node. With no mask the stroke SHALL be drawn exactly as before.

#### Scenario: Mask on
- **WHEN** a mask covers the middle of a stroke
- **THEN** the covered part is not drawn and the rest is drawn as before

#### Scenario: Serialize
- **WHEN** a node with a mask is serialized
- **THEN** the result has no mask

#### Scenario: Mask removed
- **WHEN** the mask is cleared
- **THEN** the stroke is drawn in full

#### Scenario: Translucent colour
- **WHEN** a translucent stroke is drawn with a mask
- **THEN** each surviving run has uniform opacity

### Requirement: Cutting with a mask that grows costs only what is new
The stroke node SHALL cut a stroke with an erase mask that only grows at a cost that depends on the capsules added since the last time, not on all of them, for strokes with a look and strokes without one, while the stroke and its look are the same. The result SHALL equal what working out every capsule again gives.

#### Scenario: One more capsule
- **WHEN** a capsule is added to a mask that has been cut before
- **THEN** only that capsule is worked out, and the result equals that of a fresh cut

#### Scenario: The stroke changes
- **WHEN** the points, the width or the look of the stroke change, or the capsules are not a continuation of the ones seen
- **THEN** the cut starts again and equals a fresh cut
