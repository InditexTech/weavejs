<!--
SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)

SPDX-License-Identifier: Apache-2.0
-->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.31.0] - 2025-06-25

### Changed

- [#445](https://github.com/InditexTech/weavejs/issues/445) Improve the grid behavior
- [#447](https://github.com/InditexTech/weavejs/issues/447) Avoid plugins to throw when not installed
- [#448](https://github.com/InditexTech/weavejs/issues/448) Enable wheel pan without needing to hold the space bar

### Fixed

- [#449](https://github.com/InditexTech/weavejs/issues/449) Free draw tool incorrectly selects frame and switches cursor to hand when drawing inside a frame
- [#456](https://github.com/InditexTech/weavejs/issues/456) Fix invalid action `inditex/gha-workflowdispatch@v1` on release workflow

## [0.30.1] - 2025-06-20

\### Fixed

- [#430](https://github.com/InditexTech/weavejs/issues/430) The fontStyle property is not applied to the textarea while writing a text node
- [#431](https://github.com/InditexTech/weavejs/issues/431) Editing a rotated text looks broken

## [0.30.0] - 2025-06-19

\### Added

- [#435](https://github.com/InditexTech/weavejs/issues/435) Generate base64 image on Export Nodes Action
- [#437](https://github.com/InditexTech/weavejs/issues/437) Add support to ShadowDOM

### Changed

- [#426](https://github.com/InditexTech/weavejs/issues/426) Don't set default plugins on React Helper

\### Fixed

- [#427](https://github.com/InditexTech/weavejs/issues/427) Fix activating area selector when context menu is activated and then cancelled

## [0.29.1] - 2025-06-19

### Fixed

- [#424](https://github.com/InditexTech/weavejs/issues/424) Fix zoom with wheel mouse

## [0.29.0] - 2025-06-18

\### Added

- [#306](https://github.com/InditexTech/weavejs/issues/306) Improve touch devices support

### Changed

- [#419](https://github.com/InditexTech/weavejs/issues/419) Nodes, fill white and stroke black by default

\### Fixed

- [#420](https://github.com/InditexTech/weavejs/issues/420) Nodes export to image is wrong

## [0.28.0] - 2025-06-18

\### Added

- [#332](https://github.com/InditexTech/weavejs/issues/332) Presence feedback when moving

### Changed

- [#416](https://github.com/InditexTech/weavejs/issues/416) Update create app frontend

### Fixed

- [#411](https://github.com/InditexTech/weavejs/issues/411) Snapping lines when transforming taking into account transformed node

## [0.27.4] - 2025-06-18

### Fixed

- [#413](https://github.com/InditexTech/weavejs/issues/413) Copying and pasting a frame causes a serialization error that breaks the canvas

## [0.27.3] - 2025-06-17

### Fixed

- [#409](https://github.com/InditexTech/weavejs/issues/409) When calling updateNode on a frame's title, the new title does not visually update immediately

## [0.27.2] - 2025-06-17

### Fixed

- [#405](https://github.com/InditexTech/weavejs/issues/405) Text node, on edition mode, click outside not working

## [0.27.1] - 2025-06-16

### Fixed

- [#403](https://github.com/InditexTech/weavejs/issues/403) Fix text jump when editing Text node

## [0.27.0] - 2025-06-16

\### Added

- [#400](https://github.com/InditexTech/weavejs/issues/400) Allow styles customizations on Frame title

### Fixed

- [#398](https://github.com/InditexTech/weavejs/issues/398) Sometimes when adding text on the Text node, it wraps without need to

## [0.26.2] - 2025-06-13

### Added

- [#396](https://github.com/InditexTech/weavejs/issues/396) Refresh Azure Web PubSub store connection token

## [0.26.1] - 2025-06-13

### Fixed

- [#381](https://github.com/InditexTech/weavejs/issues/381) Fix color picker issues

## [0.26.0] - 2025-06-12

\### Added

- [#388](https://github.com/InditexTech/weavejs/issues/388) Allow the image tool to receive a specific event to trigger the crop mode

### Changed

- [#304](https://github.com/InditexTech/weavejs/issues/304) Improve stores connectivity

### Fixed

- [#387](https://github.com/InditexTech/weavejs/issues/387) Image border issues on the first render

## [0.25.0] - 2025-06-12

### Added

- [#380](https://github.com/InditexTech/weavejs/issues/380) Allow WeaveTextToolAction to pass node properties

## [0.24.1] - 2025-06-10

### Fixed

- [#377](https://github.com/InditexTech/weavejs/issues/377) Copy / paste with context menu fails

## [0.24.0] - 2025-06-10

### Changed

- [#357](https://github.com/InditexTech/weavejs/issues/357) On cursor position perform paste
- [#365](https://github.com/InditexTech/weavejs/issues/365) Improved drag & drop elements

### Fixed

- [#364](https://github.com/InditexTech/weavejs/issues/364) User pointer not disappearing on disconnection
- [#371](https://github.com/InditexTech/weavejs/issues/371) Images not appearing on library when copy/pasted from other place (external)

## [0.23.1] - 2025-06-06

### Fixed

- [#360](https://github.com/InditexTech/weavejs/issues/360) Documentation issues

## [0.23.0] - 2025-06-06

### Added

- [#353](https://github.com/InditexTech/weavejs/issues/324) Regular polygon node & action

## [0.22.1] - 2025-06-05

### Fixed

- [#351](https://github.com/InditexTech/weavejs/issues/351) Missing zoom steps

## [0.22.0] - 2025-06-05

### Added

- [#324](https://github.com/InditexTech/weavejs/issues/324) Arrow node & action
- [#325](https://github.com/InditexTech/weavejs/issues/325) Circle node & action
- [#326](https://github.com/InditexTech/weavejs/issues/326) Star node & action

### Fixed

- [#349](https://github.com/InditexTech/weavejs/issues/349) Fix zoom issues

## [0.21.2] - 2025-06-04

### Fixed

- [#342](https://github.com/InditexTech/weavejs/issues/342) Fix image initialization
- [#343](https://github.com/InditexTech/weavejs/issues/343) Update create-app frontend

## [0.21.1] - 2025-06-04

### Fixed

- [#339](https://github.com/InditexTech/weavejs/issues/339) Image resizing issue
- [#340](https://github.com/InditexTech/weavejs/issues/340) Frames resizing when interacting with them

## [0.21.0] - 2025-06-04

### Changed

- [#330](https://github.com/InditexTech/weavejs/issues/330) Performance improvements
- [#333](https://github.com/InditexTech/weavejs/issues/333) Update create-app frontend

\### Fixed

- [#329](https://github.com/InditexTech/weavejs/issues/329) Fix initial state of images when cropping
- [#334](https://github.com/InditexTech/weavejs/issues/334) Don't include d.ts as ts files on bundle

## [0.20.4] - 2025-06-03

### Changed

- [#322](https://github.com/InditexTech/weavejs/issues/322) Update create-app frontend

### Fixed

- [#327](https://github.com/InditexTech/weavejs/issues/327) Fix missing uncroppedImage property on image

## [0.20.3] - 2025-06-03

### Fixed

- [#320](https://github.com/InditexTech/weavejs/issues/320) Fix module augmentation exports

## [0.20.2] - 2025-06-03

### Fixed

- [#238](https://github.com/InditexTech/weavejs/issues/238) Crop image resizing improvement

## [0.20.1] - 2025-05-30

### Fixed

- [#318](https://github.com/InditexTech/weavejs/issues/318) Building issues when finding definitions for augmenting Konva module

## [0.20.0] - 2025-05-30

### Added

- [#305](https://github.com/InditexTech/weavejs/issues/305) Don't allow to transform when more than one element is selected
- [#308](https://github.com/InditexTech/weavejs/issues/308) Allow to configure transformer configuration per node

### Changed

- [#219](https://github.com/InditexTech/weavejs/issues/219) Improve frame
- [#302](https://github.com/InditexTech/weavejs/issues/302) Update create-app frontend

### Fixed

- [#291](https://github.com/InditexTech/weavejs/issues/291) Group of elements moving not maintaining position (all layers)
- [#300](https://github.com/InditexTech/weavejs/issues/300) Un-grouping elements are unordered
- [#310](https://github.com/InditexTech/weavejs/issues/310) Fix zoom in / out stepping before fitting
- [#311](https://github.com/InditexTech/weavejs/issues/311) Fix fit stage / selection plugin to fit correctly with the specified padding

## [0.19.0] - 2025-05-28

### Added

- [#288](https://github.com/InditexTech/weavejs/issues/288) Provide a tool for erasing elements

### Fixed

- [#290](https://github.com/InditexTech/weavejs/issues/290) Maintain text node size when changed
- [#297](https://github.com/InditexTech/weavejs/issues/297) Changing font size causes text duplication and incorrect bounding box update

## [0.18.0] - 2025-05-27

### Changed

- [#292](https://github.com/InditexTech/weavejs/issues/292) Improve Azure Web PubSub to allow EventHandler options

## [0.17.0] - 2025-05-26

### Changed

- [#287](https://github.com/InditexTech/weavejs/issues/287) Update create-app frontend

## [0.16.2] - 2025-05-26

### Fixed

- [#285](https://github.com/InditexTech/weavejs/issues/285) Text editing jumps when sidebars are opened

## [0.16.1] - 2025-05-26

### Fixed

- [#283](https://github.com/InditexTech/weavejs/issues/283) Improve pointers and selectors rendering

## [0.16.0] - 2025-05-23

### Added

- [#264](https://github.com/InditexTech/weavejs/issues/264) User selection awareness events plugin

### Changed

- [#263](https://github.com/InditexTech/weavejs/issues/263) Awareness cursor UI improvements
- [#274](https://github.com/InditexTech/weavejs/issues/274) Update create-app frontend

### Fixed

- [#245](https://github.com/InditexTech/weavejs/issues/245) Frames drag-and-drop quirks when frames overlap
- [#270](https://github.com/InditexTech/weavejs/issues/270) "m" shortcut doesn't work

## [0.15.0] - 2025-05-21

### Changed

- [#255](https://github.com/InditexTech/weavejs/issues/255) Update documentation images and favicon
- [#260](https://github.com/InditexTech/weavejs/issues/260) Update create-app frontend

### Fixed

- [#257](https://github.com/InditexTech/weavejs/issues/257) Fix loading errors on React provider

## [0.14.3] - 2025-05-21

### Fixed

- [#248](https://github.com/InditexTech/weavejs/issues/248) Mouse wheel panning only when over stage
- [#250](https://github.com/InditexTech/weavejs/issues/250) Copy / paste on frame doesn't set copied element on it
- [#253](https://github.com/InditexTech/weavejs/issues/253) Selected nodes not triggering snapping lines

## [0.14.2] - 2025-05-20

### Fixed

- [#243](https://github.com/InditexTech/weavejs/issues/243) Fix UI create-app frontend linting issues

## [0.14.1] - 2025-05-20

### Fixed

- [#235](https://github.com/InditexTech/weavejs/issues/235) Frame copy / paste not cloning internal nodes
- [#240](https://github.com/InditexTech/weavejs/issues/240) Fix text node quirks

## [0.14.0] - 2025-05-20

### Added

- [#205](https://github.com/InditexTech/weavejs/issues/205) Transformer resize change size and not scale

### Changed

- [#233](https://github.com/InditexTech/weavejs/issues/233) Update create-app frontend UI

### Fixed

- [#236](https://github.com/InditexTech/weavejs/issues/236) Missing class `WeaveStoreAzureWebPubSubSyncHost` on package `@inditextech/weave-store-azure-web-pubsub`

## [0.13.1] - 2025-05-19

### Changed

- [#227](https://github.com/InditexTech/weavejs/issues/227) Update documentation landing to new UI

## [0.13.0] - 2025-05-19

### Changed

- [#226](https://github.com/InditexTech/weavejs/issues/226) Update frontend boilerplate with latest UI changes

## [0.12.1] - 2025-05-19

### Fixed

- [#217](https://github.com/InditexTech/weavejs/issues/217) Fix rectangle creation when click and drag-and-drop
- [#218](https://github.com/InditexTech/weavejs/issues/218) Fix drag selection to frame
- [#224](https://github.com/InditexTech/weavejs/issues/224) Frame visual issues

## [0.12.0] - 2025-05-16

### Added

- [#189](https://github.com/InditexTech/weavejs/issues/189) Improve images action (avoid grey placeholder)

### Fixed

- [#215](https://github.com/InditexTech/weavejs/issues/215) Fix returned value when no state is initialized
- [#188](https://github.com/InditexTech/weavejs/issues/188) Text node edition state issues

## [0.11.0] - 2025-05-15

### Added

- [#209](https://github.com/InditexTech/weavejs/issues/209) Improve copy / paste on context menu
- [#187](https://github.com/InditexTech/weavejs/issues/187) Improve the showcase of other users pointer logic
- [#185](https://github.com/InditexTech/weavejs/issues/185) Support to zoom in and zoom out with ctrl / cmd + wheel mouse

### Fixed

- [#200](https://github.com/InditexTech/weavejs/issues/200) Movement with mouse wheel breaks the grid movement
- [#186](https://github.com/InditexTech/weavejs/issues/186) Fix copy / paste events not triggering after click outside canvas

## [0.10.3] - 2025-05-13

### Fixed

- [#176](https://github.com/InditexTech/weavejs/issues/176) Eslint warnings on create-app frontend package

## [0.10.2] - 2025-05-13

### Added

- [#174](https://github.com/InditexTech/weavejs/issues/174) Improve UI with create-app frontend template

## [0.10.1] - 2025-05-13

### Added

- [#172](https://github.com/InditexTech/weavejs/issues/172) create-app frontend changes to ask for user on rooms/:roomId page

## [0.10.0] - 2025-05-13

### Added

- [#165](https://github.com/InditexTech/weavejs/issues/165) Sort dependencies and devDependencies alphabetically on create-app generated code
- [#161](https://github.com/InditexTech/weavejs/issues/161) API to remove selected nodes programmatically

## [0.9.3] - 2025-05-13

### Fixed

- [#161](https://github.com/InditexTech/weavejs/issues/161) Fix create-app issues with Node 18 and missing dependencies

## [0.9.2] - 2025-05-09

### Fixed

- [#159](https://github.com/InditexTech/weavejs/issues/159) Fix linting warnings and errors on frontend create-app

## [0.9.1] - 2025-05-09

### Changed

- [#157](https://github.com/InditexTech/weavejs/issues/157) Update frontend create-app UI/UX

## [0.9.0] - 2025-05-09

### Added

- [#155](https://github.com/InditexTech/weavejs/issues/155) Frame node configuration improvements

## [0.8.0] - 2025-05-07

### Added

- [#144](https://github.com/InditexTech/weavejs/issues/144) Improve users connection / disconnection feedback on Azure Web PubSub store

## [0.7.1] - 2025-05-07

### Fixed

- [#148](https://github.com/InditexTech/weavejs/issues/148) Fix issue when snapping with corner anchors

## [0.7.0] - 2025-05-06

### Fixed

- [#146](https://github.com/InditexTech/weavejs/issues/146) Fix stroke sizing / deformation when transforming

## [0.6.0] - 2025-05-06

### Added

- [#143](https://github.com/InditexTech/weavejs/issues/143) Spanning also when resizing components

## [0.5.0] - 2025-05-06

### Added

- [#139](https://github.com/InditexTech/weavejs/issues/139) API to obtain a Tree representation of the nodes hierarchy
- [#138](https://github.com/InditexTech/weavejs/issues/138) API to customize styling of frame element
- [#137](https://github.com/InditexTech/weavejs/issues/137) API to customize styling of selection elements

## [0.4.0] - 2025-05-05

### Added

- [#134](https://github.com/InditexTech/weavejs/issues/134) Give feedback to the user if the element will be dropped on a Frame
- [#133](https://github.com/InditexTech/weavejs/issues/133) Moving elements to a frame or out of a frame when dragging

## [0.3.3] - 2025-04-30

### Fixed

- [#130](https://github.com/InditexTech/weavejs/issues/130) Fix sdk peerDependency on packages

## [0.3.2] - 2025-04-30

### Fixed

- [#128](https://github.com/InditexTech/weavejs/issues/128) Fix CLI templates issues

## [0.3.1] - 2025-04-30

### Fixed

- [#126](https://github.com/InditexTech/weavejs/issues/126) Fix mapping typings for nodes, plugins and actions

## [0.3.0] - 2025-04-30

### Changed

- [#123](https://github.com/InditexTech/weavejs/issues/123) Refactor action methods names
- [#116](https://github.com/InditexTech/weavejs/issues/116) Refactor plugin methods names
- [#115](https://github.com/InditexTech/weavejs/issues/115) Refactor nodes to simplify the API

## [0.2.1] - 2025-04-30

### Fixed

- [#119](https://github.com/InditexTech/weavejs/issues/119) Fix missing dependencies on CLI starter templates

## [0.2.0] - 2025-04-30

### Added

- [#117](https://github.com/InditexTech/weavejs/issues/117) Switch to tsdown

## [0.1.1] - 2025-04-25

### Fixed

- [#113](https://github.com/InditexTech/weavejs/issues/113) Fix CLI create-backend room connection controller issue on azure-web-pubsub flavor

## [0.1.0] - 2025-04-25

### Added

- [#109](https://github.com/InditexTech/weavejs/issues/109) CLI to generate app from templates to quickstart an app
- [#107](https://github.com/InditexTech/weavejs/issues/107) Set Weave instance as reference on the React helper package
- [#105](https://github.com/InditexTech/weavejs/issues/105) Fix store packages external depdendencies
- [#103](https://github.com/InditexTech/weavejs/issues/103) Fix externalized dependencies on store packages
- [#101](https://github.com/InditexTech/weavejs/issues/101) Fix missing `emittery` dependency package on the `@inditextech/weavejs-store-azure-web-pubsub` package
- [#99](https://github.com/InditexTech/weavejs/issues/99) Fix proxyPolicy is not supported in browser environment on `@inditextech/weavejs-store-azure-web-pubsub` package
- [#95](https://github.com/InditexTech/weavejs/issues/95) Refactor server part for websockets store
- [#97](https://github.com/InditexTech/weavejs/issues/97) Refactor server part for Azure web pubsub store
- [#83](https://github.com/InditexTech/weavejs/issues/83) Improve move tool
- [#81](https://github.com/InditexTech/weavejs/issues/81) Support for mobile devices (iOS & Android)
- [#77](https://github.com/InditexTech/weavejs/issues/77) Copy/paste between rooms in different tabs
- [#76](https://github.com/InditexTech/weavejs/issues/76) Drag & Drop images from local computer
- [#74](https://github.com/InditexTech/weavejs/issues/74) Improve grid plugin performance
- [#71](https://github.com/InditexTech/weavejs/issues/71) Grid plugin, define two types: lines and dots
- [#72](https://github.com/InditexTech/weavejs/issues/72) API to enable or disable plugins
- [#68](https://github.com/InditexTech/weavejs/issues/68) Pan the stage with the mouse
- [#63](https://github.com/InditexTech/weavejs/issues/53) Separate types on its own package
- [#58](https://github.com/InditexTech/weavejs/issues/58) Pass fetch client in azure web pubsub client
- [#56](https://github.com/InditexTech/weavejs/issues/56) Pass fetch client params in azure web pubsub client
- [#52](https://github.com/InditexTech/weavejs/issues/52) CommonJS support
- [#50](https://github.com/InditexTech/weavejs/issues/50) Text node updates
- [#48](https://github.com/InditexTech/weavejs/issues/48) Copy/Paste improvements
- [#46](https://github.com/InditexTech/weavejs/issues/46) Added select all and unselect all to nodes selection plugin, added toggle state to hide users pointers and improve export nodes and stage tools.
- [#44](https://github.com/InditexTech/weavejs/issues/44) Improve crop images
- [#42](https://github.com/InditexTech/weavejs/issues/42) Improve Frame node selection
- [#40](https://github.com/InditexTech/weavejs/issues/40) Frame node and create action
- [#38](https://github.com/InditexTech/weavejs/issues/38) Nodes snapping plugin
- [#34](https://github.com/InditexTech/weavejs/issues/34) Perform undo / redo by user
- [#32](https://github.com/InditexTech/weavejs/issues/32) Define an API to allow elements to set properties previous to create the element
- [#30](https://github.com/InditexTech/weavejs/issues/30) Allow seeing what other users are doing like when they are creating rectangles, lines, etc.
- [#28](https://github.com/InditexTech/weavejs/issues/28) Add an action to allow interactions
- [#26](https://github.com/InditexTech/weavejs/issues/26) Improve awareness and disconnection of user for store-azure-web-pubsub
- [#15](https://github.com/InditexTech/weavejs/issues/15) Avoid use weave.js packages internally as peer-dependencies and setup author and maintainers properties on packages
- [#12](https://github.com/InditexTech/weavejs/issues/12) Automatic changelog generation
- [#10](https://github.com/InditexTech/weavejs/issues/10) Fix packages names to be on @inditextech scope
- [#8](https://github.com/InditexTech/weavejs/issues/8) ESLint OSS rules
- [#2](https://github.com/InditexTech/weavejs/issues/2) Improve rendering handling

### Fixed

- [#65](https://github.com/InditexTech/weavejs/issues/65) Azure Web PubSub package errors with missing imports
- [#60](https://github.com/InditexTech/weavejs/issues/60) Missing params propagation on store-azure-web-pubsub client
- [#36](https://github.com/InditexTech/weavejs/issues/36) Fix add scope to undoManager
- [#24](https://github.com/InditexTech/weavejs/issues/24) Bug when loading rooms with text or images
- [#18](https://github.com/InditexTech/weavejs/issues/18) Fix awareness not working on store-azure-web-pubsub

[Unreleased]: https://github.com/InditexTech/weavejs/compare/0.31.0...HEAD

[0.31.0]: https://github.com/InditexTech/weavejs/compare/0.30.1...0.31.0

[0.30.1]: https://github.com/InditexTech/weavejs/compare/0.30.0...0.30.1

[0.30.0]: https://github.com/InditexTech/weavejs/compare/0.29.1...0.30.0

[0.29.1]: https://github.com/InditexTech/weavejs/compare/0.29.0...0.29.1

[0.29.0]: https://github.com/InditexTech/weavejs/compare/0.28.0...0.29.0

[0.28.0]: https://github.com/InditexTech/weavejs/compare/0.27.4...0.28.0

[0.27.4]: https://github.com/InditexTech/weavejs/compare/0.27.3...0.27.4

[0.27.3]: https://github.com/InditexTech/weavejs/compare/0.27.2...0.27.3

[0.27.2]: https://github.com/InditexTech/weavejs/compare/0.27.1...0.27.2

[0.27.1]: https://github.com/InditexTech/weavejs/compare/0.27.0...0.27.1

[0.27.0]: https://github.com/InditexTech/weavejs/compare/0.26.2...0.27.0

[0.26.2]: https://github.com/InditexTech/weavejs/compare/0.26.1...0.26.2

[0.26.1]: https://github.com/InditexTech/weavejs/compare/0.26.0...0.26.1

[0.26.0]: https://github.com/InditexTech/weavejs/compare/0.25.0...0.26.0

[0.25.0]: https://github.com/InditexTech/weavejs/compare/0.24.1...0.25.0

[0.24.1]: https://github.com/InditexTech/weavejs/compare/0.24.0...0.24.1

[0.24.0]: https://github.com/InditexTech/weavejs/compare/0.23.1...0.24.0

[0.23.1]: https://github.com/InditexTech/weavejs/compare/0.23.0...0.23.1

[0.23.0]: https://github.com/InditexTech/weavejs/compare/0.22.1...0.23.0

[0.22.1]: https://github.com/InditexTech/weavejs/compare/0.22.0...0.22.1

[0.22.0]: https://github.com/InditexTech/weavejs/compare/0.21.2...0.22.0

[0.21.2]: https://github.com/InditexTech/weavejs/compare/0.21.1...0.21.2

[0.21.1]: https://github.com/InditexTech/weavejs/compare/0.21.0...0.21.1

[0.21.0]: https://github.com/InditexTech/weavejs/compare/0.20.4...0.21.0

[0.20.4]: https://github.com/InditexTech/weavejs/compare/0.20.3...0.20.4

[0.20.3]: https://github.com/InditexTech/weavejs/compare/0.20.2...0.20.3

[0.20.2]: https://github.com/InditexTech/weavejs/compare/0.20.1...0.20.2

[0.20.1]: https://github.com/InditexTech/weavejs/compare/0.20.0...0.20.1

[0.20.0]: https://github.com/InditexTech/weavejs/compare/0.19.0...0.20.0

[0.19.0]: https://github.com/InditexTech/weavejs/compare/0.18.0...0.19.0

[0.18.0]: https://github.com/InditexTech/weavejs/compare/0.17.0...0.18.0

[0.17.0]: https://github.com/InditexTech/weavejs/compare/0.16.2...0.17.0

[0.16.2]: https://github.com/InditexTech/weavejs/compare/0.16.1...0.16.2

[0.16.1]: https://github.com/InditexTech/weavejs/compare/0.16.0...0.16.1

[0.16.0]: https://github.com/InditexTech/weavejs/compare/0.15.0...0.16.0

[0.15.0]: https://github.com/InditexTech/weavejs/compare/0.14.3...0.15.0

[0.14.3]: https://github.com/InditexTech/weavejs/compare/0.14.2...0.14.3

[0.14.2]: https://github.com/InditexTech/weavejs/compare/0.14.1...0.14.2

[0.14.1]: https://github.com/InditexTech/weavejs/compare/0.14.0...0.14.1

[0.14.0]: https://github.com/InditexTech/weavejs/compare/0.13.1...0.14.0

[0.13.1]: https://github.com/InditexTech/weavejs/compare/0.13.0...0.13.1

[0.13.0]: https://github.com/InditexTech/weavejs/compare/0.12.1...0.13.0

[0.12.1]: https://github.com/InditexTech/weavejs/compare/0.12.0...0.12.1

[0.12.0]: https://github.com/InditexTech/weavejs/compare/0.11.0...0.12.0

[0.11.0]: https://github.com/InditexTech/weavejs/compare/0.10.3...0.11.0

[0.10.3]: https://github.com/InditexTech/weavejs/compare/0.10.2...0.10.3

[0.10.2]: https://github.com/InditexTech/weavejs/compare/0.10.1...0.10.2

[0.10.1]: https://github.com/InditexTech/weavejs/compare/0.10.0...0.10.1

[0.10.0]: https://github.com/InditexTech/weavejs/compare/0.9.3...0.10.0

[0.9.3]: https://github.com/InditexTech/weavejs/compare/0.9.2...0.9.3

[0.9.2]: https://github.com/InditexTech/weavejs/compare/0.9.1...0.9.2

[0.9.1]: https://github.com/InditexTech/weavejs/compare/0.9.0...0.9.1

[0.9.0]: https://github.com/InditexTech/weavejs/compare/0.8.0...0.9.0

[0.8.0]: https://github.com/InditexTech/weavejs/compare/0.7.1...0.8.0

[0.7.1]: https://github.com/InditexTech/weavejs/compare/0.7.0...0.7.1

[0.7.0]: https://github.com/InditexTech/weavejs/compare/0.6.0...0.7.0

[0.6.0]: https://github.com/InditexTech/weavejs/compare/0.5.0...0.6.0

[0.5.0]: https://github.com/InditexTech/weavejs/compare/0.4.0...0.5.0

[0.4.0]: https://github.com/InditexTech/weavejs/compare/0.3.3...0.4.0

[0.3.3]: https://github.com/InditexTech/weavejs/compare/0.3.2...0.3.3

[0.3.2]: https://github.com/InditexTech/weavejs/compare/0.3.1...0.3.2

[0.3.1]: https://github.com/InditexTech/weavejs/compare/0.3.0...0.3.1

[0.3.0]: https://github.com/InditexTech/weavejs/compare/0.2.1...0.3.0

[0.2.1]: https://github.com/InditexTech/weavejs/compare/0.2.0...0.2.1

[0.2.0]: https://github.com/InditexTech/weavejs/compare/0.1.1...0.2.0

[0.1.1]: https://github.com/InditexTech/weavejs/compare/0.1.0...0.1.1

[0.1.0]: https://github.com/InditexTech/weavejs/releases/tag/0.1.0
