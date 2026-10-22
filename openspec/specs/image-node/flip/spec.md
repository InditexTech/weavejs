## Purpose

Defines native horizontal and vertical flipping of image nodes: independent, persisted flip state that is rendered consistently in the browser and on the server, survives transforms, cropping and serialization, and is undoable, without generating a new image asset.

## Requirements

### Requirement: Independent horizontal and vertical flip
The system SHALL let an image node be flipped horizontally and vertically, with each axis stored and toggled independently and composable with the other.

#### Scenario: Flip one axis
- **WHEN** a consumer flips an image horizontally
- **THEN** the image is mirrored left-to-right and its vertical orientation is unchanged

#### Scenario: Flip both axes
- **WHEN** a consumer flips an image horizontally and then vertically
- **THEN** the image is mirrored on both axes

#### Scenario: Double flip restores original
- **WHEN** a consumer flips the same axis twice
- **THEN** the visual and serialized state equal the original state

### Requirement: Flip preserves geometry and style
Flipping SHALL be performed on the image's local axes and SHALL NOT change the node's position, visual center, positive width and height, rotation, z-order or styles.

#### Scenario: Rotated image flipped
- **WHEN** a rotated image is flipped on either axis
- **THEN** its center, dimensions, rotation and stacking order are unchanged

### Requirement: Flip is exposed through a documented API
The system SHALL expose flipping both as a Weave-level operation taking the image node and an axis, and as node-level horizontal and vertical operations.

#### Scenario: Weave-level flip
- **WHEN** a consumer requests a flip of an image node on a given axis through Weave
- **THEN** that axis of the image is toggled

#### Scenario: Node-level flip
- **WHEN** a consumer calls the horizontal or vertical flip on an image node
- **THEN** the corresponding axis is toggled

### Requirement: Flip state is persisted without negative dimensions
The system SHALL persist the flip state of each axis as a boolean in the node's serialized state and SHALL NOT store negative width, height or scale to represent it. The flip state SHALL survive serialization, deserialization, copy/paste, reload and server-side rendering.

#### Scenario: Copy and paste
- **WHEN** a flipped image is copied and pasted
- **THEN** the pasted image has the same flip state

#### Scenario: Server-side rendering parity
- **WHEN** a flipped image is rendered by the server-side renderer
- **THEN** the output matches the browser rendering

### Requirement: Flip survives transforms
Resizing, rotating, grouping and ungrouping a flipped image SHALL preserve its flip state and orientation.

#### Scenario: Resize flipped image
- **WHEN** a flipped image is resized
- **THEN** it keeps positive dimensions and remains flipped on the same axes

### Requirement: Flip is a single undoable operation
Each flip SHALL be a single undo/redo step through the standard state update mechanism.

#### Scenario: Undo a flip
- **WHEN** a consumer flips an image and then undoes
- **THEN** the image returns to its prior orientation in one undo step

### Requirement: Backward compatibility
Images without flip properties SHALL render exactly as before and SHALL be treated as not flipped on both axes. Their serialized state SHALL NOT gain flip properties until a flip is applied.

#### Scenario: Legacy canvas
- **WHEN** a canvas created before this capability is loaded
- **THEN** all images render unchanged

### Requirement: Flip is ignored while cropping
A flip request SHALL have no effect while the image is in crop mode.

#### Scenario: Flip during crop mode
- **WHEN** a flip is requested while the image is being cropped
- **THEN** the flip state does not change

### Requirement: Crop data is unaffected by flip
Crop information SHALL remain expressed in the unflipped source image space, and flipping SHALL NOT modify it. A cropped image SHALL render with its crop window mirrored consistently with the flip.

#### Scenario: Flip a cropped image
- **WHEN** a cropped image is flipped
- **THEN** its stored crop information is unchanged and the rendered content is mirrored within the same bounds

### Requirement: Crop editing on flipped images matches what is displayed
While editing the crop of a flipped image, the system SHALL display the image mirrored exactly as it is rendered outside crop mode, SHALL position the crop window over the content the user sees, and SHALL store the confirmed crop in the unflipped source image space.

#### Scenario: Open crop on a flipped, cropped image
- **WHEN** a user enters crop mode on a flipped image that already has a crop
- **THEN** the crop window covers the same visible content as before entering crop mode

#### Scenario: Confirm crop without changes
- **WHEN** a user enters crop mode on a flipped image and confirms without moving the window
- **THEN** the stored crop information is unchanged

#### Scenario: Crop a flipped image
- **WHEN** a user selects a window on a flipped image and confirms
- **THEN** the cropped result shows exactly the content inside the selected window
