# Spec Delta

## MODIFIED Requirements

### Requirement: The legacy profile reproduces current behaviour
The system SHALL provide, for every profile, a legacy preset whose recorded points for any input sequence are identical to those the brush tool produces without any profile configuration. The legacy preset SHALL be the default for every profile until the application selects another. The deliberate exceptions, which apply to every profile including the legacy one, are that a stroke in progress during a pinch ends when the finger that drew it lifts, where earlier releases left the tool stuck in the drawing state and the stroke unsaved; and that the stroke saved when the pointer is released is kept within a bound of the stroke that was drawn (see `brush-tool/finish-fidelity`), so its points are those of the previous release only while that bound is 0.

#### Scenario: Default behaviour is unchanged
- **WHEN** an application uses the brush tool without any profile configuration and sets the tool's `finalizeMaxDeviationPx` to 0
- **THEN** the recorded points of every stroke are identical to those of the previous release

#### Scenario: Default behaviour keeps the saved stroke faithful
- **WHEN** an application uses the brush tool without any profile configuration
- **THEN** the capture, pressure and stabilization of every stroke are those of the previous release, and the saved stroke is within the bound of the stroke as drawn

#### Scenario: A pinch during a stroke is not a regression
- **WHEN** a pinch gesture is in progress while a finger stroke is being drawn and the finger that drew the stroke lifts
- **THEN** the stroke is saved with the points recorded so far and the tool is ready for the next stroke

#### Scenario: Selecting the legacy preset explicitly
- **WHEN** an application selects the legacy preset on a profile
- **THEN** strokes drawn with that profile record the same points as the default behaviour
