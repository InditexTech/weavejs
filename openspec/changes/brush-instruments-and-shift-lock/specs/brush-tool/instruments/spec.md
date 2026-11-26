# Spec Delta

## Purpose

Lets applications select a named pen, a bundle of stroke look, node properties and input-profile settings, in one call, while leaving the brush unchanged for applications that never select one.

## ADDED Requirements

### Requirement: Instruments are opt-in
The system SHALL NOT change brush behaviour, input profiles, look or node properties unless an instrument is selected.

#### Scenario: No instrument selected
- **WHEN** an application never calls `setInstrument`
- **THEN** strokes are captured, stored and drawn exactly as in the previous release

### Requirement: An instrument is selected by id
The system SHALL publish the instruments `pencil`, `pen`, `fineliner`, `marker`, `highlighter`, `brush` and `fountainPen`, and SHALL apply the chosen one to new strokes with `setInstrument(id)`. Applying an instrument SHALL set the look, the stroke node properties and the input-profile changes that instrument defines, scaled to the current stroke width. The call SHALL report whether it was applied and any errors.

#### Scenario: Highlighter
- **WHEN** an application selects `highlighter`
- **THEN** new strokes have constant width, flat ends, opacity 0.75 and the `multiply` composite operation

#### Scenario: Unknown id
- **WHEN** an application selects an id that is not published
- **THEN** nothing changes and the result reports the error

#### Scenario: Stroke in progress
- **WHEN** an instrument is selected while a stroke is being drawn
- **THEN** that stroke keeps the settings it started with

#### Scenario: Strokes already drawn
- **WHEN** an instrument is selected
- **THEN** strokes already on the canvas keep the look they were saved with

### Requirement: The selection is sticky and readable
The system SHALL report the selected instrument with `getInstrument()`. A later change to the look or to an input profile made through the tool's own setters SHALL mark the selection as `custom`. Clearing the look with `null` or applying a scenario SHALL also leave no instrument selected.

#### Scenario: Read back
- **WHEN** an application selects `marker` and then calls `getInstrument()`
- **THEN** it receives `marker`

#### Scenario: Manual tweak
- **WHEN** an instrument is selected and the application then calls `setLook` with a patch
- **THEN** `getInstrument()` reports `custom`

### Requirement: Instruments are configurable portable data
The exported brush configuration SHALL include the selected instrument as an optional field, and import SHALL accept documents without it. The document version SHALL remain 1.

#### Scenario: Round trip
- **WHEN** a configuration exported with `pen` selected is imported
- **THEN** `getInstrument()` reports `pen`

#### Scenario: Document from before this change
- **WHEN** a configuration without the instrument field is imported
- **THEN** it is accepted and no instrument is selected

### Requirement: Instrument characteristics
Each instrument SHALL differ in character as follows: `fineliner` constant width with round ends; `marker` flat ends with 0.12 thinning; `highlighter` as above; `pencil` and `pen` pressure-responsive width (speed-derived where the device reports no pressure); `brush` tapered ends with variance; `fountainPen` width that follows the angle between travel and a fixed nib.

#### Scenario: Mouse with the pen instrument
- **WHEN** a mouse draws with `pen` selected
- **THEN** the width varies with drawing speed
