<!--
SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)

SPDX-License-Identifier: Apache-2.0
-->

# Weave.js / Create Weave Backend App

This package uses the NPM [`init`](https://docs.npmjs.com/cli/v8/commands/npm-init) functionality to initialize the backend-side of a project based on Weave.js.

## Setup

This is a monorepo, to install this package dependencies, just setup the monorepo, this can be done by locating on the `/code` project and execute the following command.

```sh
$ npm install
```

## Usage

This is a monorepo, this commands need to be from the `/code` folder of the repo.

### Build the package

```sh
$ npm run build --workspace=create-weave-backend-app
```

### Link the package

```sh
$ npm run link --workspace=create-weave-backend-app
```

### Lint the package

```sh
$ npm run lint --workspace=create-weave-backend-app
```

### Test the package

```sh
$ npm run test --workspace=create-weave-backend-app
```

### Test the app creation

Link the package to your global NPM setup and then run the following command:

```sh
$ npm create weave-backend-app
```

This will launch the Weave backend app creation tool.

## License

This project is licensed under the terms of the [Apache-2.0](LICENSE) license.

© 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
