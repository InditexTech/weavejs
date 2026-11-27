# Spec Delta

## MODIFIED Requirements

### Requirement: Width follows a configurable rule
The system SHALL compute a stroke's width from pressure using a rule stored in the look: a minimum and maximum width as fractions of the stroke width, a response curve, and optional start and end tapers. The legacy rule SHALL remain the one used when no look is present. When a stroke is shorter than its start and end tapers together, the system SHALL shorten both in proportion, so that the stroke reaches its full width where they meet and is not narrowed from both ends at once.

#### Scenario: Constant pressure
- **WHEN** a stroke has the same pressure at every point and the look defines a width range
- **THEN** its width is constant and lies within the range

#### Scenario: Tapered ends
- **WHEN** the look defines start and end tapers
- **THEN** the stroke narrows toward both ends over the configured distances

#### Scenario: A stroke shorter than its tapers
- **WHEN** a stroke is shorter than its start and end tapers together
- **THEN** both tapers are shortened in proportion and the stroke reaches its full width where they meet

#### Scenario: A stroke long enough for its tapers
- **WHEN** a stroke is at least as long as its start and end tapers together
- **THEN** it is drawn over the configured distances, as before

## ADDED Requirements

### Requirement: The box of a stroke includes its ink
The system SHALL give as the box of a stroke the box of its points widened by half of its stroke width on every side, for every caller of its client rectangle, including one that leaves the stroke of a node out of its box, since the stroke of this node is its ink and not a border. The width and the height of the node SHALL remain those of the box of its points. The frame of a hover and the frame of a selection SHALL be the same box.

#### Scenario: A caller that leaves the stroke out
- **WHEN** a stroke with a stroke width of 24 is asked for its box and the caller leaves the stroke out
- **THEN** the box is the box of its points widened by 12 on every side

#### Scenario: Hover and selection
- **WHEN** a stroke is hovered and, then, selected
- **THEN** the frame of the hover and the frame of the selection have the same position and size, and surround the line, its ends included

#### Scenario: The saved node
- **WHEN** a stroke is saved
- **THEN** its width and height are those of the box of its points, as before
