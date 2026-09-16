## Purpose

Defines how a stroke's recorded points are smoothed into a rendered ribbon, so that the rendered curve and its width stay numerically stable and visually faithful to the input regardless of how unevenly spaced those points are.

## ADDED Requirements

### Requirement: Rendered stroke curves stay within a bounded envelope of their control points
The system SHALL render a stroke's smoothed curve so that it does not bulge or overshoot beyond a bounded envelope around the straight-line path connecting its consecutive recorded points, regardless of how unevenly those points are spaced along the stroke.

#### Scenario: A stroke's first two points are close together, followed by a much larger gap
- **WHEN** a stroke's first recorded point and second recorded point are very close together, and the third recorded point is much farther away
- **THEN** the rendered curve near the start of the stroke does not bulge outward past a bounded envelope around the control-point path

#### Scenario: A mid-stroke direction change has densely-then-sparsely spaced points
- **WHEN** a stroke contains a run of closely-spaced points immediately followed by a run of widely-spaced points, such as often occurs around a sudden change of direction
- **THEN** the rendered curve through that transition remains smooth and does not kink or overshoot past a bounded envelope around the control-point path

### Requirement: Rendered stroke width does not overshoot recorded pressure values
The system SHALL render a stroke's width so that it does not exceed the range of pressure values recorded at nearby points, regardless of how unevenly those points are spaced.

#### Scenario: Uneven point spacing near differing pressure values
- **WHEN** two consecutive recorded points have different pressure values and are unevenly spaced relative to their neighbors
- **THEN** the rendered width between them does not exceed the wider of the two points' pressure-derived widths

### Requirement: A stroke node's configured spline resolution and resampling spacing govern its rendering
The system SHALL use a stroke node's own configured spline resolution and resampling spacing values to control curve subdivision density and control-point spacing when rendering that node, rather than a fixed value independent of its configuration.

#### Scenario: A node configured with a different spline resolution renders at that resolution
- **WHEN** a stroke node is configured with a spline resolution different from another node's
- **THEN** the two nodes' rendered curves reflect their own configured resolution (e.g. differing subdivision density) rather than an identical, fixed value

#### Scenario: A node configured with a different resampling spacing renders at that spacing
- **WHEN** a stroke node is configured with a resampling spacing different from another node's
- **THEN** the two nodes' rendered curves reflect their own configured spacing rather than an identical, fixed value
