# Spec Delta

## Purpose

Defines how the brush tool picks an input profile for each stroke and how capturing, pressure handling, stabilizing and finishing a stroke are configured per device and changed at runtime, so mouse, finger, Apple Pencil and desktop pens each produce faithful strokes.

## ADDED Requirements

### Requirement: A device profile is resolved for every stroke
The system SHALL resolve one input profile (`mouse`, `touch`, `pen.applePencil` or `pen.desktop`) from the first event of each stroke, based on the reported pointer type and platform, and SHALL use that profile for the whole stroke. An unknown pointer type SHALL resolve to the `mouse` profile. The embedding application SHALL be able to replace the resolution and to force a specific profile.

#### Scenario: A pen on an iPad
- **WHEN** a stroke starts with a pen pointer on an iPad
- **THEN** the `pen.applePencil` profile is used for that stroke

#### Scenario: A pen on a desktop computer
- **WHEN** a stroke starts with a pen pointer on a desktop operating system
- **THEN** the `pen.desktop` profile is used for that stroke

#### Scenario: Unknown pointer type
- **WHEN** a stroke starts with an empty or unrecognised pointer type
- **THEN** the `mouse` profile is used

#### Scenario: Application override
- **WHEN** the application supplies its own resolution or forces a profile
- **THEN** that choice is used instead of the automatic one

#### Scenario: A profile never changes mid-stroke
- **WHEN** a different pointer type reports events while a stroke is in progress
- **THEN** the profile chosen at stroke start is kept until the stroke ends

### Requirement: Profiles are configurable and changeable at runtime
The system SHALL accept a configuration per profile covering capture, pressure, stabilizer, finalize and, for `touch`, gesture-guard behaviour. The system SHALL allow any profile's configuration to be read and changed while the application is running, and a change SHALL apply from the next stroke without recreating the tool.

#### Scenario: Changing a profile at runtime
- **WHEN** the application changes the `pen.desktop` configuration while no stroke is in progress
- **THEN** the next pen stroke on a desktop uses the new configuration and no reload is needed

#### Scenario: A change during a stroke
- **WHEN** a profile's configuration is changed while a stroke is in progress
- **THEN** the stroke in progress keeps the configuration it started with

### Requirement: The legacy profile reproduces current behaviour
The system SHALL provide, for every profile, a legacy preset whose recorded points for any input sequence are identical to those the brush tool produces without any profile configuration. The legacy preset SHALL be the default for every profile until the application selects another. The one deliberate exception, which applies to every profile including the legacy one, is that a stroke in progress during a pinch ends when the finger that drew it lifts, where earlier releases left the tool stuck in the drawing state and the stroke unsaved.

#### Scenario: Default behaviour is unchanged
- **WHEN** an application uses the brush tool without any profile configuration
- **THEN** the recorded points of every stroke are identical to those of the previous release

#### Scenario: A pinch during a stroke is not a regression
- **WHEN** a pinch gesture is in progress while a finger stroke is being drawn and the finger that drew the stroke lifts
- **THEN** the stroke is saved with the points recorded so far and the tool is ready for the next stroke

#### Scenario: Selecting the legacy preset explicitly
- **WHEN** an application selects the legacy preset on a profile
- **THEN** strokes drawn with that profile record the same points as the default behaviour

### Requirement: Every coalesced sample can become a stroke point
The system SHALL support a capture mode in which every batched ("coalesced") sample reported with a pointer move becomes its own stroke point, using that sample's own position, pressure and event time, in the order reported. In that mode, no two consecutive samples with different reported positions SHALL be recorded at the same position.

#### Scenario: A batch with distinct positions
- **WHEN** a pointer move reports three coalesced samples at three different positions
- **THEN** three stroke points are recorded, each at its own sample's position

#### Scenario: Speculative samples
- **WHEN** a pointer move also reports predicted samples
- **THEN** predicted points are drawn only provisionally and are removed before the next real samples are added and when the stroke ends

#### Scenario: A browser without batched samples
- **WHEN** the browser does not provide coalesced samples
- **THEN** the single reported event is used, as today

### Requirement: Smoothing uses event time
When a time-based smoothing mode is selected, the system SHALL compute elapsed time between samples from the time reported on each sample's event, not from the time at which the sample is processed, so that processing a batch in one step does not change the smoothing applied.

#### Scenario: Same samples, different processing timing
- **WHEN** the same sequence of timed samples is processed one by one or as a single batch
- **THEN** the recorded pressures are identical

### Requirement: A position stabilizer can be applied per profile
The system SHALL support, per profile, a position stabilizer that is one of: none, One Euro filter, pulled string, or streamline. Distances configured for a stabilizer SHALL be interpreted in screen pixels when the stabilizer is zoom-aware, so its effect on screen is the same at every zoom level, and in canvas units otherwise. When a stroke ends, the system SHALL complete the stroke at the pen's final position.

#### Scenario: Hand shake on a mouse
- **WHEN** the `mouse` profile uses a stabilizer and the pointer jitters by one pixel around a straight path
- **THEN** the recorded points deviate from the straight path by less than the raw input does

#### Scenario: The stroke ends where the pen lifted
- **WHEN** a stroke with a stabilizer ends
- **THEN** its last point is at the position where the pen was lifted

#### Scenario: Same effect at different zoom levels
- **WHEN** the same on-screen jitter is drawn at 50% and at 200% zoom with a zoom-aware stabilizer
- **THEN** the remaining jitter measured on screen is the same at both zoom levels

#### Scenario: Stabilizer off
- **WHEN** the stabilizer is set to none
- **THEN** recorded positions equal the reported positions

### Requirement: Finishing tolerance is expressed in screen pixels
The system SHALL support a finishing step whose tolerance is configured in screen pixels and converted using the zoom level in force when the stroke ends, so that the same tolerance gives the same on-screen fidelity at any zoom. The finishing step SHALL be selectable among: none, simplification by position, simplification by position and pressure, and curve fitting.

#### Scenario: Same fidelity at different zoom levels
- **WHEN** the same gesture is drawn at 30% and at 200% zoom with the same pixel tolerance
- **THEN** the maximum on-screen deviation of the finished stroke from the drawn path is within that tolerance at both zoom levels

#### Scenario: Pressure detail is kept
- **WHEN** the finishing step is simplification by position and pressure
- **THEN** points where pressure changes noticeably are kept even if they lie on a straight path

### Requirement: Touch strokes can wait for a second finger
The system SHALL support, for the `touch` profile, a wait (in milliseconds and pixels of movement) before a finger stroke is committed, and SHALL cancel the stroke without leaving a mark if a second finger lands during that wait. The `touch` profile SHALL also support an option that stops finger input from drawing once a pen has been used.

#### Scenario: A pinch starts as a stroke
- **WHEN** a finger touches down and a second finger lands within the configured wait
- **THEN** no stroke is created

#### Scenario: A deliberate single-finger stroke
- **WHEN** a finger moves beyond the configured distance or time without a second finger
- **THEN** the stroke is created, starting at the original touch-down point

#### Scenario: Finger after pen
- **WHEN** the option is on and a finger touches the canvas after a pen has been used
- **THEN** the finger does not draw

#### Scenario: No stuck state after a pinch
- **WHEN** a pinch ends while a stroke was in progress
- **THEN** the brush tool is ready for the next stroke

### Requirement: Each stroke records how it was drawn
When the lab plugin is active, the system SHALL attach to each new stroke the identifiers of the profile and preset that produced it, so that a stroke's origin can be seen later. When the lab plugin is not active, no such identifiers SHALL be stored.

#### Scenario: Lab on
- **WHEN** a stroke is drawn with the lab plugin active
- **THEN** the stroke carries the profile and preset identifiers

#### Scenario: Lab off
- **WHEN** a stroke is drawn without the lab plugin
- **THEN** the stroke carries no profile or preset identifiers
