<!--
SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)

SPDX-License-Identifier: Apache-2.0
-->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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

[Unreleased]: https://github.com/InditexTech/weavejs/compare/0.9.3...HEAD
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
