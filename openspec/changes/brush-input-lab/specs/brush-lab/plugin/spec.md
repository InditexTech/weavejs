# Spec Delta

## Purpose

Defines the opt-in lab plugin that shows what a pen or pointer reports, overlays raw and processed paths, measures each stroke and replays recent strokes under other presets, entirely in memory and without storing or uploading any recording.

## ADDED Requirements

### Requirement: The lab is opt-in and separate
The system SHALL provide the lab plugin as a separate entry point that is not part of the default SDK entry. An application that does not register the plugin SHALL see no lab behaviour, overlays or stored identifiers.

#### Scenario: Plugin not registered
- **WHEN** an application uses the SDK without registering the plugin
- **THEN** no overlay is drawn, no metric is computed and strokes carry no lab data

#### Scenario: Plugin registered
- **WHEN** an application registers the plugin
- **THEN** the lab features become available and can be switched on and off at runtime

### Requirement: The plugin reports the detected device
The system SHALL report, for the pointer in use, its type, the resolved profile, the observed pen sample rate, the number of samples per event, the pressure range seen so far, whether tilt is reported, whether predicted samples are available, the zoom level and the frame rate. It SHALL warn when a pen appears to be reported as a mouse (for example a constant pressure of 0.5 with a mouse pointer type).

#### Scenario: A pen with pressure
- **WHEN** a pen draws a stroke
- **THEN** the report shows pointer type `pen`, the resolved profile and a pressure range wider than a single value

#### Scenario: A tablet reported as a mouse
- **WHEN** strokes arrive with pointer type `mouse` and constant pressure while a tablet is expected
- **THEN** the plugin shows a warning that pen input may be disabled in the driver

### Requirement: Overlays show raw and processed paths
The system SHALL be able to draw, on a layer of its own that does not affect saved content, the raw reported samples, the stabilized path, the final stroke points and a pressure graph for the latest stroke. Each overlay SHALL be switchable independently.

#### Scenario: Raw samples shown
- **WHEN** the raw-samples overlay is on and a stroke is drawn
- **THEN** one marker is drawn per reported sample, including batched samples

#### Scenario: Overlays do not change the document
- **WHEN** overlays are shown or hidden
- **THEN** no node in the document is added, changed or removed

### Requirement: Per-stroke metrics are computed
The system SHALL compute for each stroke: number of reported samples, number of recorded points, number of dropped duplicate positions, effective sample rate, jitter, lag between raw and stabilized paths, how far the stroke moved when it was finished, width roughness, and drawing time. Metrics SHALL be emitted as an event and held in memory only.

#### Scenario: A stroke finishes
- **WHEN** a stroke ends
- **THEN** an event carries its metrics

#### Scenario: Reload
- **WHEN** the page is reloaded
- **THEN** no metrics from earlier strokes remain

### Requirement: Recent strokes can be replayed as ghosts
The system SHALL keep the raw samples of the last few strokes in memory and SHALL be able to replay any of them through other presets, drawing the results as temporary strokes on the lab's own layer labelled with the preset name. Ghosts SHALL NOT be added to the document, saved, uploaded or shown to other users.

#### Scenario: Comparing presets
- **WHEN** ghosts for presets A and C are requested for the last stroke
- **THEN** two labelled temporary strokes are drawn from the same gesture

#### Scenario: Ghosts are temporary
- **WHEN** ghosts are cleared or the page is reloaded
- **THEN** they disappear and the document is unchanged

#### Scenario: Limited memory
- **WHEN** more strokes are drawn than the configured number kept
- **THEN** the oldest raw samples are discarded

### Requirement: No recording is stored or transmitted
The system SHALL NOT write raw samples, timing, pressure or tilt data to the document, to browser storage, to a file or to any network destination. Only configuration values MAY be stored, and only by the embedding application.

#### Scenario: Strokes recorded in a lab session
- **WHEN** a lab session ends
- **THEN** the saved document contains only the strokes' points and optional look and origin identifiers, and no raw samples

#### Scenario: No network use
- **WHEN** the plugin is active
- **THEN** it makes no network request
