<!--
SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)

SPDX-License-Identifier: Apache-2.0
-->

# Weave.js / React Helper

This package generates the `@inditextech/weave-react` package, a lightweight React helper, to easy the integration of Weave.js into React-based applications. It provides a Provider (WeaveProvider) and it's complimentary Hook (useWeave), with a simple store powered by [Zustand](https://zustand.docs.pmnd.rs/getting-started/introduction).

## Setup

This is a monorepo, to install this package dependencies, just setup the monorepo, this can be done by locating on the `/code` project and execute the following command.

```sh
$ npm install
```

## Usage

This is a monorepo, this commands need to be from the `/code` folder of the repo.

### Build the package

```sh
$ npm run build --workspace=@inditextech/weave-react
```

### Link the package

```sh
$ npm run link --workspace=@inditextech/weave-react
```

### Lint the package

```sh
$ npm run lint --workspace=@inditextech/weave-react
```

### Test the package

```sh
$ npm run test --workspace=@inditextech/weave-react
```

## License

This project is licensed under the terms of the [Apache-2.0](LICENSE) license.

© 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
