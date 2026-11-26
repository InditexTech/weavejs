# Spec Delta

## Purpose

Lets a user draw straight lines at 8 headings with the mouse by holding Shift, without affecting any application that does not enable it.

## ADDED Requirements

### Requirement: The lock is disabled by default
The system SHALL NOT react to the Shift key while drawing unless the lock is enabled in the brush configuration or by the selected instrument.

#### Scenario: Default
- **WHEN** a mouse stroke is drawn with Shift held and the lock is not enabled
- **THEN** the stroke follows the pointer exactly as before

### Requirement: Shift locks the stroke to the nearest of 8 headings
When enabled and a mouse stroke is in progress, the system SHALL anchor where Shift goes down, wait until the pointer is 16 screen pixels from the anchor, lock the nearest of the 8 headings (every 45 degrees), and project every following pointer position onto that heading. The lock SHALL be applied before the stabilizer. The threshold SHALL be in screen pixels, independent of zoom.

#### Scenario: Locking
- **WHEN** Shift is held and the pointer moves 16 px at about 10 degrees from the anchor
- **THEN** the stroke continues along the 0 degree heading

#### Scenario: Below the threshold
- **WHEN** Shift is held and the pointer is less than 16 px from the anchor
- **THEN** the stroke follows the pointer without locking

#### Scenario: Shift released
- **WHEN** Shift is released during a stroke
- **THEN** the lock ends and the stroke follows the pointer again

### Requirement: Mouse only
The lock SHALL NOT apply to touch or pen strokes.

#### Scenario: Pen stroke
- **WHEN** a pen draws with Shift held and the lock enabled
- **THEN** the stroke is not locked
