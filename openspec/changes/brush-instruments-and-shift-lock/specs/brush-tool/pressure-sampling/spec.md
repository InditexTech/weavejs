# Spec Delta

## ADDED Requirements

### Requirement: Velocity-synthesised pressure
When a profile sets `pressure.synth` to `velocity`, the system SHALL derive the pressure of each point from the pointer speed in screen pixels per millisecond, independent of zoom, and SHALL store it in the recorded points at capture so that simplification and every viewer see the same widths. It SHALL apply only where the device reports no pressure; real pen pressure SHALL be unchanged. The default SHALL leave pressure as before.

#### Scenario: Mouse, fast stroke
- **WHEN** a mouse draws quickly with `synth` set to `velocity`
- **THEN** recorded pressures are lower than for a slow stroke over the same path

#### Scenario: Zoom
- **WHEN** the same screen movement is drawn at two zoom levels
- **THEN** the synthesised pressures are equal

#### Scenario: Pen
- **WHEN** a pen that reports pressure draws with `synth` set to `velocity`
- **THEN** the recorded pressure is the pen's pressure

#### Scenario: Default
- **WHEN** `synth` is not set
- **THEN** pressure is recorded as in the previous release
