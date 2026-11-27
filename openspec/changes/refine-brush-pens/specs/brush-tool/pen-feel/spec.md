# Spec Delta

## Purpose

Keeps the line of a stabilized pen close to the pen at any pace, so that releasing the pointer does not change the stroke, and gives each instrument ends and smoothing that suit it.

## ADDED Requirements

### Requirement: The One Euro stabilizer can measure the speed quickly
The system SHALL accept, on a profile, `stabilizer.dCutoff`: the cutoff in hertz of the filter with which the One Euro stabilizer measures the speed. It SHALL be between 0.1 and 60 and SHALL default to 1, so that a profile that does not set it behaves as before. A higher value SHALL let the smoothing ease off sooner when the pen speeds up, and SHALL NOT change how a slow stroke is smoothed.

#### Scenario: Not set
- **WHEN** a profile uses the One Euro stabilizer and does not set `dCutoff`
- **THEN** the recorded points are those of a profile that sets it to 1

#### Scenario: A stroke that starts fast
- **WHEN** a stroke starts at 1200 px/s and the stabilizer is One Euro with a `minCutoff` of 4 and a `beta` of 0.04
- **THEN** 25 ms into the stroke the line is less than half as far behind the pen with a `dCutoff` of 15 as with the default

#### Scenario: A slow stroke
- **WHEN** a slow stroke with the shake of a hand is drawn with a `dCutoff` of 15
- **THEN** its jitter is less than 60% of the jitter without a stabilizer

#### Scenario: Published as a tunable
- **WHEN** the tunable settings are listed
- **THEN** `stabilizer.dCutoff` is among them with its range, default and help text, and out-of-range values are rejected

### Requirement: The pens that follow the pen closely do
The `pen`, `fountainPen` and `brush` instruments SHALL smooth the position of a mouse and of a finger with a One Euro filter with a `dCutoff` of 12 Hz, so that the line keeps within a few screen pixels of the pen at the pace of a quick stroke and a stroke that is released does not change by more than that at its end. The pen profiles of a device that reports pressure SHALL be left as they are.

#### Scenario: A quick stroke is released
- **WHEN** a stroke is drawn with a mouse at the pace of a quick stroke with the `fountainPen`, and the pointer is released
- **THEN** the line was less than 6 screen pixels from the pointer before the release, and the stroke saved is the same as the one that was drawn, but for that end

#### Scenario: Touch
- **WHEN** a finger draws with the `pen`, `fountainPen` or `brush`
- **THEN** the same filter smooths it

### Requirement: The ends of the pen and the brush are not needles
The `pen` SHALL end in a taper half a stroke width long, and never shorter than 2 px, so that its end is rounded. The `brush` SHALL never be drawn thinner than 40% of its width, SHALL taper 0.75 stroke widths at its start and 1.5 at its end, and SHALL taper with the default shape, which ends blunt, where it used a shape that ends in a needle. The distances SHALL follow the stroke width in force when the instrument is selected, as the other distances along the stroke do.

#### Scenario: The pen at several widths
- **WHEN** the `pen` is selected with a stroke width of 8, and of 20, and of 1
- **THEN** its end taper is 4, 10 and 2

#### Scenario: The brush
- **WHEN** the `brush` is selected with a stroke width of 8
- **THEN** its minimum width is at least 0.4 of the stroke width, its start taper is 6 and its end taper is 12, and it sets no taper shape of its own

### Requirement: The marker and the highlighter are smooth and end round
The `marker` and the `highlighter` SHALL have round ends. They SHALL smooth the position of a mouse and of a finger with a pulled string of 6 and of 8 screen pixels, so that their line is smooth and is never more than the leash behind the pen. The pen profiles of a device that reports pressure SHALL be left as they are.

#### Scenario: Round ends
- **WHEN** the `marker` or the `highlighter` is selected
- **THEN** the look of new strokes has round ends

#### Scenario: Smoothed with a pulled string
- **WHEN** the `marker` or the `highlighter` is selected
- **THEN** the stabilizer of the mouse and touch profiles is a pulled string whose leash is in screen pixels and is at most 10

#### Scenario: A tablet pen
- **WHEN** an instrument other than the pen ones is selected
- **THEN** the profiles of a pen that reports pressure are the legacy ones, as before
