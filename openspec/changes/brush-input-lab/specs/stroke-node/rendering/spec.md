# Spec Delta

## Purpose

Defines how a stroke node turns its recorded points and an optional per-stroke look into a ribbon, so that turns, ends and translucent colours render cleanly and identically for every viewer while strokes without a look render exactly as before.

## ADDED Requirements

### Requirement: Strokes without a look render as before
The system SHALL render a stroke that has no look setting exactly as in the previous release, and SHALL NOT require any change to existing documents.

#### Scenario: Existing stroke
- **WHEN** a document created before this change is opened
- **THEN** every stroke is drawn the same as in the previous release

### Requirement: A stroke's look is stored with the stroke
The system SHALL allow a stroke to carry an optional look describing its outline mode, curve type, width rule, end treatment and zoom handling. The look SHALL be part of the stroke's saved data, so every viewer and every export draws it the same way. A viewer that does not understand a look SHALL draw the stroke as a legacy stroke.

#### Scenario: Two viewers
- **WHEN** a stroke with a look is shown to two users on different devices
- **THEN** both see the same outline

#### Scenario: Look not understood
- **WHEN** a viewer runs an earlier release that does not know the look
- **THEN** the stroke is drawn with the legacy rendering and no error occurs

### Requirement: Round outline keeps turns and ends round
When a stroke's outline mode is round, the system SHALL draw it as the union of discs at the recorded points joined by segments, filled once, so that sharp turns, reversals and ends are round and never produce spikes, notches or flattened tips, for any stroke width.

#### Scenario: A reversal like the top of an "n"
- **WHEN** a stroke goes up and immediately back down along nearly the same path
- **THEN** the outline at the turning point is round and has no spike

#### Scenario: A sharp point like the bottom of a "v"
- **WHEN** a stroke turns sharply
- **THEN** the outline at the point is round, with a width equal to the stroke width at that point

#### Scenario: Pressure changes
- **WHEN** pressure differs between neighbouring points
- **THEN** the outline width changes smoothly between them without exceeding the wider of the two

### Requirement: Translucent colours are uniform
The system SHALL draw a stroke in a translucent colour with the same opacity everywhere, including its ends and the places where the stroke crosses itself or where dash segments meet.

#### Scenario: A translucent stroke with round ends
- **WHEN** a stroke with a colour of 50% opacity is drawn
- **THEN** every point of the ribbon, including both ends, has the same opacity

#### Scenario: A dashed translucent stroke
- **WHEN** a dashed stroke has a translucent colour
- **THEN** each dash has uniform opacity

### Requirement: The curve through points does not overshoot
When a stroke's curve type is centripetal, the system SHALL draw a curve through the recorded points that stays within a bounded distance of the polyline joining them, for unevenly spaced points, for both position and width.

#### Scenario: Close points followed by a far point
- **WHEN** two recorded points are very close and the next is much farther away
- **THEN** the curve does not bulge outside a small envelope around the polyline

#### Scenario: Uneven pressure spacing
- **WHEN** pressure changes between unevenly spaced points
- **THEN** the drawn width never exceeds the widest of the neighbouring widths

### Requirement: Rendering detail can follow the zoom level
When zoom-aware detail is on, the system SHALL choose point spacing and curve subdivision in screen pixels, so the visible smoothness of a stroke does not depend on the zoom level.

#### Scenario: Zoomed in
- **WHEN** a stroke is shown at 200% zoom with zoom-aware detail on
- **THEN** no straight facets longer than one screen pixel are visible along its curves

### Requirement: Width follows a configurable rule
The system SHALL compute a stroke's width from pressure using a rule stored in the look: a minimum and maximum width as fractions of the stroke width, a response curve, and optional start and end tapers. The legacy rule SHALL remain the one used when no look is present.

#### Scenario: Constant pressure
- **WHEN** a stroke has the same pressure at every point and the look defines a width range
- **THEN** its width is constant and lies within the range

#### Scenario: Tapered ends
- **WHEN** the look defines start and end tapers
- **THEN** the stroke narrows toward both ends over the configured distances

### Requirement: Looks can be previewed on existing strokes without saving
The system SHALL support a viewer-side override that draws all strokes with a chosen look on that screen only. The override SHALL NOT change any saved stroke and SHALL NOT be seen by other users.

#### Scenario: Preview
- **WHEN** a preview look is turned on
- **THEN** all strokes on that screen are drawn with it and no document change is made

#### Scenario: Preview off
- **WHEN** the preview is turned off
- **THEN** every stroke is drawn with its own saved look, or as legacy if it has none
