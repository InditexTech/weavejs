<!--
SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)

SPDX-License-Identifier: Apache-2.0
-->

# Weave.js / SDK

This package generates the `@inditextech/weave-sdk` package, the Weave SDK, designed power-lift all the necessary stuff to build collaborative applications using real-time data synchronization powered by [Yjs](https://github.com/yjs/yjs/tree/master), relying on [CRDTs](https://github.com/yjs/yjs/blob/master/README.md#Yjs-CRDT-Algorithm) (Conflict-Free Replicated Data Types).

## Setup

This is a monorepo, to install this package dependencies, just setup the monorepo, this can be done by locating on the `/code` project and execute the following command.

```sh
$ npm install
```

## Usage

This is a monorepo, this commands need to be from the `/code` folder of the repo.

### Build the package

```sh
$ npm run build --workspace=@inditextech/weave-sdk
```

### Link the package

```sh
$ npm run link --workspace=@inditextech/weave-sdk
```

### Lint the package

```sh
$ npm run lint --workspace=@inditextech/weave-sdk
```

### Test the package

```sh
$ npm run test --workspace=@inditextech/weave-sdk
```

## License

This project is licensed under the terms of the [Apache-2.0](LICENSE) license.

© 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
