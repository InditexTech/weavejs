# Spec Delta

## Purpose

Keeps a stroke that is saved when the pointer is released looking like the stroke that was drawn, along its whole length and at its end, and lets a stabilized stroke reach the pointer without a jump.

## ADDED Requirements

### Requirement: A saved stroke stays within a bound of the drawn one
The system SHALL keep the stroke it saves when the pointer is released within a bound of the stroke as it was drawn. The difference SHALL be measured as the strokes are drawn, not point by point: it is the largest distance between their centerlines, or between their widths, taken in both directions. The bound SHALL be in screen pixels, at the zoom level in force when the stroke ends. A profile SHALL be able to set it with `finalize.maxDeviationPx`; a profile that leaves it empty SHALL use the tool's `finalizeMaxDeviationPx`, whose default is 0.25. A bound of 0 SHALL save what the finishing step leaves, and a finishing step of `none` SHALL be left as it is, since it keeps every point.

#### Scenario: Default behaviour
- **WHEN** an application uses the brush tool without any profile configuration and draws a stroke
- **THEN** the saved stroke is within 0.25 screen pixels of the stroke as drawn, for a thin line

#### Scenario: A profile sets its own bound
- **WHEN** a profile sets a bound, and the tool's bound is different
- **THEN** strokes drawn with that profile are held to the profile's bound

#### Scenario: Earlier behaviour
- **WHEN** the tool's bound is 0 and a profile leaves its own empty
- **THEN** the saved stroke is what the finishing step leaves, as in the previous release

#### Scenario: Same bound at any zoom
- **WHEN** the same gesture is drawn at 30% and at 200% zoom
- **THEN** the saved stroke is within the bound in screen pixels at both zoom levels

#### Scenario: Instruments
- **WHEN** an instrument is selected and a stroke is drawn
- **THEN** the saved stroke is held to the bound the profile or the tool gives, like any other

### Requirement: The bound is for thin lines
The system SHALL allow a broad stroke to move by up to 5% of its drawn width, never less than the bound and never more than four times it, because a shift that is a visible part of a hairline is not on a broad stroke. The width SHALL be the median width the stroke is drawn with.

#### Scenario: A hairline
- **WHEN** a stroke is drawn with a line no wider than 5 times the bound
- **THEN** the saved stroke is within the bound

#### Scenario: A broad stroke
- **WHEN** a stroke is drawn 24 px wide with a bound of 0.25
- **THEN** the saved stroke may differ from the drawn one by up to 1 px, and has fewer points than the same stroke drawn with a hairline

### Requirement: A stroke is rebuilt from the drawn points where it moves too far
When the result of the finishing step is farther from the drawn stroke than the bound, the system SHALL rebuild the stroke from the points that were drawn. It SHALL start from a coarse simplification and add, step by step, the drawn point nearest to each place where the saved line departs most from the drawn one, until none does. It SHALL add points only where the line needs them, SHALL keep the first and the last point, and SHALL NOT save more points than were drawn. Where adding points cannot bring the lines together, as at a sharp turn, it SHALL keep the drawn points around that place.

#### Scenario: A sharp turn
- **WHEN** a stroke has a sharp reversal, and the finishing step leaves a line that strays far from it
- **THEN** the saved stroke is within the bound and keeps the points around the turn

#### Scenario: A fitted curve that overshoots
- **WHEN** the finishing step fits a curve that bends away from the drawn line
- **THEN** the curve is not saved and the stroke is rebuilt from the drawn points

#### Scenario: A smooth stroke stays small
- **WHEN** a smooth stroke is drawn without noise in its positions or pressure
- **THEN** the saved stroke has less than half the points that were drawn, however tight the bound

#### Scenario: A result already within the bound
- **WHEN** the finishing step leaves a stroke within the bound
- **THEN** it is saved as it is

### Requirement: A stroke that cannot be matched in time is kept as drawn
When no set of the drawn points keeps the stroke within the bound, or finding it takes longer than 80 milliseconds, the system SHALL save every drawn point, so that the stroke looks exactly as it did, and SHALL NOT hold up the release of the pointer further.

#### Scenario: No match in time
- **WHEN** the work of keeping a stroke within the bound exceeds 80 milliseconds
- **THEN** every drawn point is saved

### Requirement: A stabilized stroke reaches the pointer without a jump
When a stroke with a stabilizer that completes it at the pointer's last position ends, and its line is more than 1.5 screen pixels from that position, the system SHALL complete the line along the way the pointer went, from the sample of its path nearest to the end of the line, and not with a straight segment. The way SHALL be moved by how far the end of the line is off it, less and less, so that it is exact at the last position. When the pointer's path was not kept back as far as the line (more than 32 screen pixels from it, or more than the last 64 samples), the stroke SHALL be completed with a straight segment. The system SHALL draw the completion growing along that way over `catchUpMs` milliseconds (90 by default), slowing as it arrives, before it saves the stroke. It SHALL save the same points as saving at once would. It SHALL save the stroke at once, without the glide, when `catchUpMs` is 0, when the completion is shorter than 1.5 screen pixels, when there are no animation frames, when the next stroke starts, or when the tool is left. The pointer moving after it lifted SHALL NOT change the stroke.

#### Scenario: The end glides
- **WHEN** a stabilized stroke lagging behind the pointer ends
- **THEN** its end moves along the way the pointer went over about 90 ms, each step smaller than the one before, and the stroke is then saved ending at the pointer

#### Scenario: The line keeps the turn the pointer made
- **WHEN** the pointer turns sharply within the distance the line lags behind it, and then lifts
- **THEN** the saved stroke passes through the turn instead of cutting it off with a straight segment to the last position

#### Scenario: The path was not kept
- **WHEN** the end of the line is farther from the kept path of the pointer than the limit
- **THEN** the stroke is completed with a straight segment to the last position

#### Scenario: Same stroke as saving at once
- **WHEN** the same gesture is drawn with and without the glide
- **THEN** the saved points are identical

#### Scenario: The next stroke starts
- **WHEN** a new stroke starts while the end of the previous one is gliding
- **THEN** the previous stroke is saved ending at the pointer before the new one begins

#### Scenario: The tool is left
- **WHEN** the tool is deactivated while the end of a stroke is gliding
- **THEN** the stroke is saved ending at the pointer

#### Scenario: No stabilizer
- **WHEN** a stroke without a stabilizer ends
- **THEN** it is saved at once
